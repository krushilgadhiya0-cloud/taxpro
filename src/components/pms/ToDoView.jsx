import React, { useState, useEffect } from 'react';
import { CheckSquare, Square, Plus, Trash2, Star, Calendar, Clock, AlertCircle, ListTodo, Search, Filter } from 'lucide-react';

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
  
  const [newText, setNewText] = useState('');

  useEffect(() => {
    localStorage.setItem('taxpro_todos', JSON.stringify(todos));
  }, [todos]);

  const addTodo = (e) => {
    if (e) e.preventDefault();
    if (!newText.trim()) return;
    
    // Assign due date based on active tab context
    let contextDate = '2026-07-27'; // Mock 'Today'
    if (activeTab === 'Tomorrow') contextDate = '2026-07-28';
    if (activeTab === 'Next 7 Days') contextDate = '2026-08-01';

    const newTaskObj = { 
      id: Date.now(), 
      text: newText.trim(), 
      category: 'General', 
      completed: false,
      isStarred: activeTab === 'Starred',
      dueDate: contextDate 
    };

    setTodos(prev => [newTaskObj, ...prev]);
    setNewText('');
    
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
           
           <h2 className="text-xl font-extrabold text-[#1e1e2d] font-outfit mb-4">{activeTab}</h2>

           {/* Add Input Bar */}
           <form onSubmit={addTodo} className="flex gap-3 mb-6">
             <input 
               type="text" 
               placeholder={`Add a task to '${activeTab}'...`}
               value={newText}
               onChange={e => setNewText(e.target.value)}
               className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
             />
             <button type="button" onClick={addTodo} className="px-6 py-3 bg-[#1e1e2d] text-white font-black text-sm rounded-xl hover:bg-indigo-600 flex items-center gap-2 shadow-md transition-colors hover:shadow-lg">
               <Plus className="w-4 h-4" /> Add
             </button>
           </form>

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
               filteredTodos.map(t => (
                 <div 
                   key={t.id} 
                   className={`flex items-center justify-between p-4 rounded-xl border transition-all group ${
                     t.completed ? 'bg-gray-50 border-gray-100 opacity-80' : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300'
                   }`}
                 >
                   
                   <div className="flex items-start gap-4 flex-1">
                     <button onClick={() => toggleTodo(t.id)} className="mt-0.5 relative group/check">
                        {t.completed ? (
                          <div className="w-5 h-5 rounded bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                            <CheckSquare className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded border-2 border-gray-300 group-hover/check:border-indigo-500 transition-colors"></div>
                        )}
                     </button>

                     <div className="flex flex-col mr-4">
                       <span className={`text-sm font-bold transition-colors ${t.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
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
             )}
           </div>
        </div>
      </div>

    </div>
  );
}
