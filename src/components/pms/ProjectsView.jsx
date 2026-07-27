import React, { useState } from 'react';
import { FolderKanban, Plus, Layers, Target, CheckCircle2, X, Calendar, Search, MoreVertical, Users, Check } from 'lucide-react';

export default function ProjectsView({ onShowToast }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectsList, setProjectsList] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [openProject, setOpenProject] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    dueDate: '',
    priority: 'Medium'
  });

  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!formData.name) return;
    
    setProjectsList([
      { 
        id: Date.now(), 
        ...formData, 
        status: 'Active',
        tasks: [
          { id: Date.now() + 1, title: 'Analyze requirements', completed: false },
          { id: Date.now() + 2, title: 'Setup workspace', completed: false },
          { id: Date.now() + 3, title: 'Final deployment', completed: false }
        ]
      },
      ...projectsList
    ]);
    
    setIsModalOpen(false);
    setFormData({name:'', description:'', startDate:'', dueDate:'', priority:'Medium'});
    if (onShowToast) onShowToast(`✓ Project "${formData.name}" initialized successfully!`, 'success');
  };

  const toggleTaskStatus = (projectId, taskId) => {
    setProjectsList(prevList => prevList.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          tasks: p.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
        };
      }
      return p;
    }));
    if (openProject && openProject.id === projectId) {
      setOpenProject(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
      }));
    }
  };

  const getFilteredProjects = () => {
    let filtered = projectsList;
    if (activeFilter !== 'All') {
      filtered = filtered.filter(p => p.status === activeFilter);
    }
    if (searchQuery) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
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
          
          {/* Decorative Circle Icon */}
          <div className="w-24 h-24 rounded-full bg-indigo-50 border-[6px] border-white shadow-sm flex items-center justify-center mb-6">
            <FolderKanban className="w-10 h-10 text-indigo-600" />
          </div>

          {/* Headings */}
          <h1 className="text-3xl font-extrabold text-gray-900 font-outfit mb-3">Group your tasks with Projects</h1>
          <p className="text-base text-gray-500 max-w-lg mb-10 leading-relaxed font-medium">
            Bundle related tasks under a single project to track your team's workflow and measure milestones efficiently.
          </p>

          {/* The 3 Steps List */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 w-full max-w-md text-left mb-10">
            
            <div className="flex flex-col gap-6">
              
              {/* Step 1 */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm">
                  1
                </div>
                <div className="pt-1">
                  <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-500" /> Create a project
                  </h3>
                </div>
              </div>

              {/* Connecting line */}
              <div className="h-4 border-l-2 border-dashed border-gray-200 ml-4 -my-4 z-0 hidden sm:block"></div>

              {/* Step 2 */}
              <div className="flex items-start gap-4 relative z-10">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm">
                  2
                </div>
                <div className="pt-1">
                  <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500" /> Add tasks to it
                  </h3>
                </div>
              </div>

              {/* Connecting line */}
              <div className="h-4 border-l-2 border-dashed border-gray-200 ml-4 -my-4 z-0 hidden sm:block"></div>

              {/* Step 3 */}
              <div className="flex items-start gap-4 relative z-10">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm">
                  3
                </div>
                <div className="pt-1">
                  <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-500" /> Track progress
                  </h3>
                </div>
              </div>

            </div>
          </div>

          {/* Primary CTA Button */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-8 py-3.5 bg-[#0f766e] hover:bg-teal-800 text-white font-extrabold text-sm rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-5 h-5" />
            Create your first project
          </button>

        </div>
      ) : (
        <div className="w-full max-w-7xl h-full flex flex-col pt-4">
          
          {/* Top Bar matching image */}
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
                  placeholder="Search..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm w-full outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#0f766e] text-white rounded-xl text-sm font-bold shadow-sm hover:shadow-md hover:bg-teal-800 transition-colors"
              >
                <Plus className="w-4 h-4" /> New
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
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold transition-all ${
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

          {/* Projects Grid matching image */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-4 w-full">
            {filteredProjects.map((p) => {
              const completedTasks = p.tasks.filter(t => t.completed).length;
              const totalTasks = p.tasks.length;
              const progressPct = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

              return (
                <div 
                  key={p.id} 
                  onClick={() => setOpenProject(p)}
                  className="bg-white border text-left border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col p-4 cursor-pointer hover:border-emerald-200"
                >
                  {/* Left Active border indicator */}
                  {p.status === 'Active' && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                  )}

                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${p.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider ${p.status === 'Active' ? 'text-emerald-500' : 'text-gray-500'}`}>
                        {p.status}
                      </span>
                    </div>
                    <button className="text-gray-400 hover:text-gray-700" onClick={e => e.stopPropagation()}>
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Title & Desc */}
                  <h3 className="font-extrabold text-gray-900 text-base leading-tight mb-1">{p.name}</h3>
                  <p className="text-xs text-gray-500 mb-6 truncate">{p.description || p.name}</p>

                  {/* Progress info */}
                  <div className="mt-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-black text-gray-900 font-outfit">{progressPct}<span className="text-xs font-bold text-gray-500 ml-0.5">%</span></span>
                      <div className="flex items-center gap-1 text-xs font-bold text-gray-500">
                        <Check className="w-3.5 h-3.5 text-emerald-500" /> {completedTasks} / {totalTasks}
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mb-4 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                    </div>

                    {/* Footer pills */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-100 text-[10px] font-bold text-gray-600">
                        <Users className="w-3.5 h-3.5" /> 0 members
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-100 text-[10px] font-bold text-gray-600">
                        <Calendar className="w-3.5 h-3.5" /> 
                        {p.startDate ? (p.startDate.slice(5).replace('-','/') + " \u2192 " + (p.dueDate ? p.dueDate.slice(5).replace('-','/') : 'Indefinite')) : 'No dates'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {filteredProjects.length === 0 && (
            <div className="py-20 text-center text-gray-500 font-bold text-sm">
              No projects found for the current filters.
            </div>
          )}
        </div>
      )}

      {/* Floating Action Button (if projects exist) */}
      {projectsList.length > 0 && (
        <button 
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-[#0f766e] text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* NEW PROJECT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
            
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <FolderKanban className="w-5 h-5 text-emerald-600" /> New project
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="project-form" onSubmit={handleCreateProject} className="flex flex-col gap-6">
                
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Project Name *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Q1 Marketing rollout" 
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium text-sm text-gray-900 shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Description (Optional)</label>
                  <textarea 
                    rows={4}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="What is this project about?" 
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none shadow-sm text-sm text-gray-800 shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Start Date</label>
                    <input 
                      type="date" 
                      value={formData.startDate}
                      onChange={e => setFormData({...formData, startDate: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm color-gray-800 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Due Date</label>
                    <input 
                      type="date"
                      value={formData.dueDate}
                      onChange={e => setFormData({...formData, dueDate: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm color-gray-800 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3">Priority</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Low', 'Medium', 'High'].map(prio => (
                      <button
                        key={prio}
                        type="button"
                        onClick={() => setFormData({...formData, priority: prio})}
                        className={`py-3 rounded-xl text-sm font-extrabold border transition-all ${
                          formData.priority === prio 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-500 shadow-sm' 
                            : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {prio}
                      </button>
                    ))}
                  </div>
                </div>

              </form>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end items-center gap-3">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="px-6 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                form="project-form" 
                type="submit" 
                className="px-6 py-2.5 rounded-xl bg-[#0f766e] hover:bg-teal-800 text-white font-bold text-sm transition-colors shadow-lg flex items-center justify-center gap-2"
              >
                Create project
              </button>
            </div>

          </div>
        </div>
      )}

      {/* OPEN PROJECT TASKS MODAL */}
      {openProject && (
        <div className="fixed inset-0 z-[60] flex justify-end p-0 md:p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setOpenProject(null)}>
          <div 
            className="bg-white h-full md:h-auto md:max-h-[90vh] w-full max-w-xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-in-right"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-emerald-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900 font-outfit">{openProject.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-100/50 px-2 py-0.5 rounded-sm">{openProject.status} PROJECT</span>
                </div>
              </div>
              <button 
                onClick={() => setOpenProject(null)} 
                className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-white rounded-full transition-colors shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 flex flex-col gap-8">
              
              <div>
                <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  To Do <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-[10px]">{openProject.tasks.filter(t => !t.completed).length}</span>
                </h3>
                <div className="flex flex-col gap-3">
                  {openProject.tasks.filter(t => !t.completed).map(task => (
                    <label key={task.id} className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-xl cursor-pointer hover:shadow-md transition-all hover:border-emerald-300">
                      <div className="pt-0.5">
                        <input 
                          type="checkbox" 
                          checked={false} 
                          onChange={() => toggleTaskStatus(openProject.id, task.id)}
                          className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-800 leading-snug">{task.title}</span>
                    </label>
                  ))}
                  {openProject.tasks.filter(t => !t.completed).length === 0 && (
                    <div className="p-6 text-center flex flex-col justify-center items-center h-32 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                      <p className="text-sm font-bold text-gray-400">All tasks completed! Great job.</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  Completed <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px]">{openProject.tasks.filter(t => t.completed).length}</span>
                </h3>
                <div className="flex flex-col gap-3">
                  {openProject.tasks.filter(t => t.completed).map(task => (
                    <label key={task.id} className="flex items-start gap-3 p-4 bg-white border border-gray-100 rounded-xl cursor-pointer hover:shadow-sm transition-all opacity-60 hover:opacity-100">
                      <div className="pt-0.5">
                        <input 
                          type="checkbox" 
                          checked={true}
                          onChange={() => toggleTaskStatus(openProject.id, task.id)}
                          className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-500 line-through leading-snug">{task.title}</span>
                    </label>
                  ))}
                  {openProject.tasks.filter(t => t.completed).length === 0 && (
                    <div className="p-4 text-center text-xs font-bold text-gray-400 border border-dashed border-gray-200 rounded-xl h-24 flex items-center justify-center">
                      No tasks completed yet.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
