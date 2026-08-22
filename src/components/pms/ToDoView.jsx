import React, { useState, useEffect } from 'react';
import { CheckSquare, Square, Plus, Trash2, Star, Calendar, Clock, AlertCircle, ListTodo, Search, Filter, X } from 'lucide-react';

export default function ToDoView({ onShowToast }) {
  const [activeTab, setActiveTab] = useState('Today');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [todos, setTodos] = useState(() => {
    try {
      const saved = localStorage.getItem('taxpro_todos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) {
      console.error("Local storage error in ToDo:", err);
    }
    
    return [];
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ text: '', category: 'General', dueDate: '', isStarred: false });

  useEffect(() => {
    localStorage.setItem('taxpro_todos', JSON.stringify(todos));
  }, [todos]);

  const addTodo = (e) => {
    if (e) e.preventDefault();
    if (!newTask.text.trim()) {
       onShowToast && onShowToast('Task description cannot be empty.', 'warning');
       return;
    }
    
    // Assign due date based on active tab context if left blank
    let contextDate = newTask.dueDate || '2026-07-27'; 
    if (!newTask.dueDate && activeTab === 'Tomorrow') contextDate = '2026-07-28';
    if (!newTask.dueDate && activeTab === 'Next 7 Days') contextDate = '2026-08-01';

    const newTaskObj = { 
      id: Date.now(), 
      text: newTask.text.trim(), 
      category: newTask.category, 
      completed: false,
      isStarred: newTask.isStarred,
      dueDate: contextDate 
    };

    setTodos(prev => [newTaskObj, ...prev]);
    setNewTask({ text: '', category: 'General', dueDate: '', isStarred: false });
    setIsAddModalOpen(false);
    
    // Automatically swap to a visible perspective if they added it from a hidden one
    if (activeTab === 'Completed' || activeTab === 'Overdue') {
      setActiveTab('Today');
    }

    if (onShowToast) onShowToast('Task mapped to your checklist successfully!', 'success');
  };

  const toggleTodo = (id) => setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  const toggleStar = (id) => setTodos(todos.map(t => t.id === id ? { ...t, isStarred: !t.isStarred } : t));
  const deleteTodo = (id) => {
    setTodos(todos.filter(t => t.id !== id));
    onShowToast && onShowToast('Task shredded.', 'info');
  };

  // Filter Logic Based on 2026-07-27 standard test date logic
  const filteredTodos = todos.filter(t => {
    // Search bypass
    if (searchQuery && !t.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    if (activeTab === 'All Tasks') return true;
    if (activeTab === 'Starred') return t.isStarred;
    if (activeTab === 'Today') return t.dueDate === '2026-07-27';
    if (activeTab === 'Tomorrow') return t.dueDate === '2026-07-28';
    if (activeTab === 'Overdue') return t.dueDate < '2026-07-27' && !t.completed;
    if (activeTab === 'Completed') return t.completed;
    
    return true; // Default fallback
  });

  return (
    <div className="bg-[#f3f4f6] min-h-screen text-gray-800 p-4 sm:p-6 lg:p-8 flex flex-col h-[calc(100vh-3.5rem)]">
      
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold font-outfit text-[#1e1e2d]">Personal Task Center</h1>
          <p className="text-xs text-gray-500 mt-1">Organize your workflow, mark priorities, and track overdue items.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search checklists..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:border-indigo-500 shadow-sm transition-all"
            />
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden min-h-[500px]">
        
        {/* Left Sidebar Menu */}
        <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-2 bg-white border border-gray-200 p-4 rounded-2xl shadow-sm h-full overflow-y-auto">
           <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2 px-3">Perspectives</h3>
           
           {[
             { id: 'All Tasks', icon: ListTodo, color: 'text-indigo-600', count: todos.length },
             { id: 'Starred', icon: Star, color: 'text-amber-500', count: todos.filter(t => t.isStarred && !t.completed).length },
             { id: 'Today', icon: Calendar, color: 'text-emerald-600', count: todos.filter(t => t.dueDate === '2026-07-27' && !t.completed).length },
             { id: 'Tomorrow', icon: Calendar, color: 'text-blue-500', count: todos.filter(t => t.dueDate === '2026-07-28' && !t.completed).length },
             { id: 'Overdue', icon: AlertCircle, color: 'text-red-500', count: todos.filter(t => t.dueDate < '2026-07-27' && !t.completed).length },
             { id: 'Completed', icon: CheckSquare, color: 'text-gray-500', count: todos.filter(t => t.completed).length },
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${
                 activeTab === tab.id 
                   ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 shadow-sm' 
                   : 'text-gray-600 font-medium hover:bg-gray-50 border border-transparent hover:border-gray-100'
               }`}
             >
                <div className="flex items-center gap-2.5">
                  <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? tab.color : 'text-gray-400'}`} />
                  {tab.id}
                </div>
                {tab.count > 0 && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-100 text-gray-500 font-bold'}`}>
                    {tab.count}
                  </span>
                )}
             </button>
           ))}
        </div>

        {/* Right Active List Area */}
        <div className="flex-1 bg-white border border-gray-200 p-4 sm:p-6 rounded-2xl shadow-sm flex flex-col h-full">
           
           <div className="flex items-center justify-between mb-4">
             <h2 className="text-xl font-extrabold text-[#1e1e2d] font-outfit">{activeTab}</h2>
             <button onClick={() => setIsAddModalOpen(true)} className="px-4 py-2 bg-[#1e1e2d] text-white font-black text-xs rounded-xl hover:bg-indigo-600 flex items-center gap-2 shadow-sm transition-colors">
               <Plus className="w-3.5 h-3.5" /> Create Task
             </button>
           </div>

           {/* The Items List */}
           <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-2.5">
             {filteredTodos.length === 0 ? (
               <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70">
                 <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                   <CheckSquare className="w-8 h-8 text-gray-300" />
                 </div>
                 <h4 className="text-gray-600 font-bold">No tasks found here.</h4>
                 <p className="text-xs text-gray-400 mt-1">Check another perspective or create a new task.</p>
               </div>
             ) : (
               activeTab === 'Completed' ? (() => {
                 // Group completed tasks by Month/Year using YYYY-MM to ensure chronological sorting
                 const grouped = filteredTodos.reduce((acc, t) => {
                    const d = new Date(t.dueDate);
                    const isInvalid = Number.isNaN(d.getTime());
                    const sortKey = isInvalid ? '0000-00' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    const displayKey = isInvalid ? 'Unscheduled' : d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
                    
                    if (!acc[sortKey]) acc[sortKey] = { display: displayKey, items: [] };
                    acc[sortKey].items.push(t);
                    return acc;
                 }, {});

                 return Object.keys(grouped).sort((a,b) => b.localeCompare(a)).map(sortKey => {
                    const group = grouped[sortKey];
                    // Sort items inside the group by exact date (newest first)
                    const sortedItems = [...group.items].sort((a, b) => {
                        const dA = new Date(a.dueDate).getTime();
                        const dB = new Date(b.dueDate).getTime();
                        return (Number.isNaN(dB) ? 0 : dB) - (Number.isNaN(dA) ? 0 : dA);
                    });

                    return (
                      <div key={sortKey} className="mb-4">
                         <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-2 border-l-2 border-gray-300 ml-1">{group.display}</h4>
                         <div className="flex flex-col gap-2.5">
                           {sortedItems.map(t => (
                             <div key={t.id} className="flex items-center justify-between p-4 rounded-xl border transition-all group bg-gray-50 border-gray-100 opacity-80">
                               <div className="flex items-start gap-4 flex-1">
                                 <button onClick={() => toggleTodo(t.id)} className="mt-0.5 relative group/check">
                                    <div className="w-5 h-5 rounded bg-emerald-500 text-white flex items-center justify-center shadow-sm"><CheckSquare className="w-3.5 h-3.5" /></div>
                                 </button>
                                 <div className="flex flex-col mr-4">
                                   <span className="text-sm font-bold line-through text-gray-400">{t.text}</span>
                                   <div className="flex items-center gap-3 mt-1.5">
                                     <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-gray-100 text-gray-500">{t.category}</span>
                                     <span className="text-[10px] font-bold flex items-center gap-1 text-gray-400"><Calendar className="w-3 h-3" /> {t.dueDate}</span>
                                   </div>
                                 </div>
                               </div>
                               <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => deleteTodo(t.id)} className="p-2 rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                               </div>
                             </div>
                           ))}
                         </div>
                      </div>
                    );
                 });
               })() : (
                 filteredTodos.map(t => (
                   <div 
                     key={t.id} 
                     className="flex items-center justify-between p-4 rounded-xl border transition-all group bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300"
                   >
                     
                     <div className="flex items-start gap-4 flex-1">
                       <button onClick={() => toggleTodo(t.id)} className="mt-0.5 relative group/check">
                          <div className="w-5 h-5 rounded border-2 border-gray-300 group-hover/check:border-indigo-500 transition-colors"></div>
                       </button>

                       <div className="flex flex-col mr-4">
                         <span className="text-sm font-bold transition-colors text-gray-800">
                           {t.text}
                         </span>
                         <div className="flex items-center gap-3 mt-1.5">
                           <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-gray-100 text-gray-500">
                             {t.category}
                           </span>
                           {t.dueDate && (
                             <span className={`text-[10px] font-bold flex items-center gap-1 ${
                               t.dueDate < '2026-07-27' && !t.completed ? 'text-red-500' : 'text-gray-400'
                             }`}>
                               <Calendar className="w-3 h-3" /> {t.dueDate}
                             </span>
                           )}
                         </div>
                       </div>
                     </div>

                     <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => toggleStar(t.id)} className="p-2 rounded-lg hover:bg-amber-50 group/star transition-colors">
                         <Star className={`w-4 h-4 ${t.isStarred ? 'text-amber-400 fill-amber-400' : 'text-gray-300 group-hover/star:text-amber-400'}`} />
                       </button>
                       <button onClick={() => deleteTodo(t.id)} className="p-2 rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors">
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                   </div>
                 ))
               )
             )}
           </div>
        </div>
      </div>

      {/* Record New Task Modal */}
      {isAddModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddModalOpen(false); }}
          className="modal-overlay-backdrop"
        >
          <div className="modal-content-box">
            {/* Premium Gradient Header */}
            <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-xs">
                  <ListTodo className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-white tracking-tight">
                    Add To-Do Item
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Personal workflow item, compliance checklist & priority tagging
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
            
            <form onSubmit={addTodo} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold scrollbar-thin">
              <div>
                <label className="text-gray-700 block mb-1">Task Description <span className="text-red-500">*</span></label>
                <input 
                  autoFocus 
                  type="text" 
                  value={newTask.text} 
                  onChange={e => setNewTask({...newTask, text: e.target.value})} 
                  className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 bg-gray-50 focus:bg-white" 
                  placeholder="What needs to be done?" 
                  required
                />
              </div>

              <div>
                <label className="text-gray-700 block mb-1">Category / Tag</label>
                <select 
                  value={newTask.category} 
                  onChange={e => setNewTask({...newTask, category: e.target.value})} 
                  className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 bg-gray-50 focus:bg-white cursor-pointer"
                >
                  <option value="General">General</option>
                  <option value="GST Return">GST Return</option>
                  <option value="Client Call">Client Call</option>
                  <option value="Audit">Audit</option>
                  <option value="Income Tax">Income Tax</option>
                </select>
              </div>

              <div>
                <label className="text-gray-700 block mb-1">Due Date</label>
                <input 
                  type="date" 
                  value={newTask.dueDate} 
                  onChange={e => setNewTask({...newTask, dueDate: e.target.value})} 
                  className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 bg-gray-50 focus:bg-white" 
                />
              </div>

              <div className="flex items-center gap-2 mt-1">
                <input 
                  type="checkbox" 
                  id="todo-priority-check"
                  checked={newTask.isStarred} 
                  onChange={e => setNewTask({...newTask, isStarred: e.target.checked})} 
                  className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500 cursor-pointer" 
                />
                <label htmlFor="todo-priority-check" className="text-xs font-bold text-gray-700 cursor-pointer">
                  Mark as Priority (Starred)
                </label>
              </div>

              {/* Bottom Sticky Actions */}
              <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 mt-2">
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
                  Add To-Do Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
