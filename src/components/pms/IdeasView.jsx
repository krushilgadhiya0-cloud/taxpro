import React, { useState, useEffect } from 'react';
import { Lightbulb, Plus, Filter, ThumbsUp, ThumbsDown, MessageSquare, Paperclip, Lock, Globe, RefreshCcw, User, Tag, X, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function IdeasView({ onShowToast }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeIdeaView, setActiveIdeaView] = useState(null);
  const [commentInput, setCommentInput] = useState('');
  const [ideas, setIdeas] = useState(() => {
    try {
      const saved = localStorage.getItem('taxpro_ideas');
      if (saved) return JSON.parse(saved) || [];
    } catch (e) {}
    return [];
  });

  const [availableDepts, setAvailableDepts] = useState([]);
  const [availableMembers, setAvailableMembers] = useState([]);

  useEffect(() => {
    localStorage.setItem('taxpro_ideas', JSON.stringify(ideas));
  }, [ideas]);

  useEffect(() => {
    const fetchLiveOptions = async () => {
      try {
        const [deptData, memData, ideasData] = await Promise.all([
          supabase.from('departments').select('name'),
          supabase.from('team_members').select('name'),
          supabase.from('ideas').select('*').order('created_at', { ascending: false })
        ]);

        if (deptData?.data) {
          setAvailableDepts(deptData.data.map(d => d.name));
        } else {
          setAvailableDepts(['General', 'Finance', 'Taxation', 'Audit']);
        }
        
        if (memData?.data) {
          setAvailableMembers(memData.data.map(m => m.name));
        }

        if (ideasData?.data && ideasData.data.length > 0) {
          const dbMapped = ideasData.data.map(i => ({
            id: i.id,
            title: i.title || "What's on your mind?",
            content: i.description || i.content || '',
            author: i.author || 'Current User',
            upvotes: i.votes || 0,
            downvotes: 0,
            status: i.status || 'New',
            tags: Array.isArray(i.tags) ? i.tags : [],
            visibility: 'Public',
            comments: Array.isArray(i.comments) ? i.comments.length : 0,
            commentList: Array.isArray(i.comments) ? i.comments : []
          }));

          setIdeas(prev => {
            const merged = [...dbMapped];
            prev.forEach(item => {
              if (!merged.some(m => String(m.id) === String(item.id))) {
                merged.push(item);
              }
            });
            return merged;
          });
        }
      } catch (e) {}
    };
    fetchLiveOptions();
  }, []);

  const [formData, setFormData] = useState({
    content: '',
    tags: '',
    autoConvert: 'Manual',
    assignDepartment: 'All',
    visibility: 'Public', // Public or Private
    attachment: ''
  });

  const [conversionModal, setConversionModal] = useState({ isOpen: false, type: null, targetIdea: null });
  const [conversionData, setConversionData] = useState({
    title: '',
    assignee: 'Unassigned',
    priority: 'Medium',
    dueDate: ''
  });

  const handleAddIdea = async (e) => {
    e.preventDefault();
    if (!formData.content) return;
    
    const ideaId = `IDEA-${Date.now()}`;
    const parsedTags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
    const newIdea = {
      id: ideaId,
      title: "What's on your mind?",
      content: formData.content,
      author: 'Current User',
      upvotes: 0,
      downvotes: 0,
      status: 'New',
      tags: parsedTags,
      visibility: formData.visibility,
      attachment: formData.attachment,
      comments: 0,
      commentList: []
    };

    setIdeas(prev => [newIdea, ...prev]);
    setIsModalOpen(false);
    setFormData({ content: '', tags: '', autoConvert: 'Manual', assignDepartment: 'All', visibility: 'Public', attachment: '' });

    // Direct save to PostgreSQL ideas table
    try {
      await supabase.from('ideas').insert([{
        id: ideaId,
        title: "What's on your mind?",
        description: formData.content,
        author: 'Current User',
        department: formData.assignDepartment || 'General',
        votes: 0,
        status: 'Under Review',
        tags: parsedTags,
        comments: []
      }]);
    } catch (err) {
      console.warn('[Idea DB Insert Note]:', err.message);
    }

    if (onShowToast) onShowToast('Idea dropped successfully to the board.', 'success');
  };

  const handleAction = (id, actionType) => {
    if (actionType === 'convert_task' || actionType === 'convert_project') {
      const idea = ideas.find(i => i.id === id);
      if (idea) {
        setConversionData({
          title: idea.content.length > 60 ? idea.content.slice(0, 60) + '...' : idea.content,
          assignee: 'Unassigned',
          priority: 'Medium',
          dueDate: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]
        });
        setConversionModal({
          isOpen: true,
          type: actionType === 'convert_task' ? 'task' : 'project',
          targetIdea: idea
        });
      }
      return;
    }

    setIdeas(prev => {
      const mapped = prev.map(idea => {
        if (idea.id === id) {
          if (actionType === 'upvote') return { ...idea, upvotes: idea.upvotes + 1 };
          if (actionType === 'downvote') return { ...idea, downvotes: idea.downvotes + 1 };
          if (actionType === 'comment') {
             setActiveIdeaView(idea);
             return idea;
          }
          if (actionType === 'delete') {
             if (onShowToast) onShowToast('Idea deleted successfully.', 'info');
             return null;
          }
        }
        return idea;
      });
      return mapped.filter(Boolean);
    });
  };

  const submitConversion = (e) => {
    e.preventDefault();
    if (!conversionModal.targetIdea) return;
    
    if (conversionModal.type === 'task') {
       const existingTasks = JSON.parse(localStorage.getItem('taxpro_global_tasks') || '[]');
       existingTasks.unshift({
           id: `TSK-${Math.floor(100 + Math.random() * 900)}`,
           title: conversionData.title,
           client: 'Internal Firm',
           category: conversionModal.targetIdea.assignDepartment !== 'All' ? conversionModal.targetIdea.assignDepartment : 'General',
           dueDate: conversionData.dueDate,
           status: 'Pending',
           priority: conversionData.priority,
           assignee: conversionData.assignee,
           project: 'None'
       });
       localStorage.setItem('taxpro_global_tasks', JSON.stringify(existingTasks));
       if (onShowToast) onShowToast('Idea successfully structured into a precise Task!', 'success');
    } else {
       const existingProjects = JSON.parse(localStorage.getItem('taxpro_projects') || '[]');
       existingProjects.unshift({
           id: Date.now(),
           name: conversionData.title,
           description: conversionModal.targetIdea.content,
           startDate: new Date().toISOString().split('T')[0],
           dueDate: conversionData.dueDate,
           priority: conversionData.priority,
           status: 'Active',
           tasks: []
       });
       localStorage.setItem('taxpro_projects', JSON.stringify(existingProjects));
       if (onShowToast) onShowToast('Idea expanded into a fully structured Project!', 'success');
    }
    window.dispatchEvent(new Event('storage'));
    
    setIdeas(prev => prev.filter(i => i.id !== conversionModal.targetIdea.id));
    
    setConversionModal({ isOpen: false, type: null, targetIdea: null });
  };

  const submitComment = (e) => {
    e.preventDefault();
    if (!commentInput.trim() || !activeIdeaView) return;
    
    setIdeas(prev => prev.map(idea => {
       if (idea.id === activeIdeaView.id) {
          const list = idea.commentList || [];
          const updated = { 
            ...idea, 
            commentList: [...list, { id: Date.now(), text: commentInput, date: new Date().toLocaleDateString(), author: 'Current User' }],
            comments: (idea.comments || 0) + 1 
          };
          setActiveIdeaView(updated);
          return updated;
       }
       return idea;
    }));
    setCommentInput('');
    if(onShowToast) onShowToast('Discussion comment posted successfully!', 'success');
  };

  const sortedIdeas = [...ideas].sort((a,b) => b.upvotes - a.upvotes);

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen text-gray-800 relative pb-24">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 rounded-2xl w-14 h-14 flex items-center justify-center">
            <Lightbulb className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#1e1e2d] font-outfit">Ideas & Suggestions</h1>
            <p className="text-sm text-gray-500 font-medium italic mt-1 text-amber-600/70">
              "Capture every thought. Vote. Promote the best into tasks."
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-sm shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" /> Add Idea
        </button>
      </div>


      {/* Ideas List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedIdeas.map((idea) => (
          <div key={idea.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col">
             
             {/* Header */}
             <div className="flex justify-between items-start mb-4">
               <div>
                  <h3 className="text-[10px] font-black text-gray-400 tracking-wider uppercase mb-1 flex items-center gap-1">
                    {idea.visibility === 'Private' ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                    {idea.author}
                  </h3>
                  <div className="text-sm text-gray-800 leading-relaxed font-medium">"{idea.content}"</div>
                  {idea.attachment && (
                    <div className="mt-2 text-xs font-bold text-indigo-600 flex items-center gap-1 bg-indigo-50/50 p-1.5 px-2.5 rounded-lg border border-indigo-100 max-w-fit cursor-pointer hover:bg-indigo-100 transition-colors" onClick={() => onShowToast && onShowToast(`Initializing secure download tunnel for ${idea.attachment}`, 'info')}>
                      <Paperclip className="w-3.5 h-3.5" /> {idea.attachment}
                    </div>
                  )}
               </div>
               
               <div className="flex flex-col items-end gap-2">
                 <span className={`text-[10px] uppercase tracking-widest font-extrabold px-2.5 py-1 rounded-md border ${
                   idea.status === 'New' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                   idea.status === 'Under Review' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                   idea.status === 'Implemented' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                   (idea.status.includes('Converted')) ? 'bg-purple-50 text-purple-700 border-purple-200' :
                   'bg-emerald-50 text-emerald-700 border-emerald-100'
                 }`}>
                   {idea.status}
                 </span>
                 <button onClick={() => handleAction(idea.id, 'delete')} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50">
                   <Trash2 className="w-4 h-4" />
                 </button>
               </div>
             </div>
             
             {/* Tags Output */}
             {idea.tags && idea.tags.length > 0 && (
               <div className="flex flex-wrap gap-2 mb-4">
                 {idea.tags.map((t, idx) => (
                   <span key={idx} className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 flex items-center gap-1">
                     # {t}
                   </span>
                 ))}
               </div>
             )}

             {/* Actions/Interactions Box */}
             <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                
                {/* Like / Dislike */}
                <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 border border-gray-200">
                  <button 
                    onClick={() => handleAction(idea.id, 'upvote')} 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-emerald-100 hover:text-emerald-700 text-gray-500 transition-colors"
                  >
                    <ThumbsUp className="w-4 h-4" /> <span className="text-xs font-bold">{idea.upvotes}</span>
                  </button>
                  <div className="w-px h-4 bg-gray-300"></div>
                  <button 
                    onClick={() => handleAction(idea.id, 'downvote')} 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-red-100 hover:text-red-700 text-gray-500 transition-colors"
                  >
                    <ThumbsDown className="w-4 h-4" /> <span className="text-xs font-bold">{idea.downvotes}</span>
                  </button>
                </div>

                {/* Commenting */}
                <button
                  onClick={() => handleAction(idea.id, 'comment')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors font-bold text-xs border border-transparent"
                >
                  <MessageSquare className="w-4 h-4" /> {idea.comments}
                </button>

             </div>
              
              {/* Conversion Actions Row */}
              <div className="mt-3 pt-3 border-t border-gray-50 flex flex-wrap gap-2">
                 <button 
                   onClick={() => handleAction(idea.id, 'convert_task')}
                   disabled={idea.status.includes('Converted')}
                   className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] uppercase tracking-wider font-extrabold rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                 >
                   To Task
                 </button>
                 <button 
                   onClick={() => handleAction(idea.id, 'convert_project')}
                   disabled={idea.status.includes('Converted')}
                   className="flex-1 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] uppercase tracking-wider font-extrabold rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                 >
                   To Project
                 </button>
              </div>
          </div>
        ))}
      </div>

      {/* CREATION ENGINE MODAL */}
      {isModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
          className="modal-overlay-backdrop"
        >
          <div className="modal-content-box max-w-2xl">
            {/* Premium Gradient Header */}
            <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-xs">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-white tracking-tight">
                    Post Suggestion & Idea
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Capture insights, workflow optimizations & feature suggestions
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
            
            <div className="flex flex-col p-6 flex-1 overflow-y-auto scrollbar-thin">
              <form id="idea-engine" onSubmit={handleAddIdea} className="flex flex-col gap-4 text-xs font-semibold">
                <div>
                  <label className="text-gray-700 block mb-1">Your Proposal / Idea Description <span className="text-red-500">*</span></label>
                  <textarea 
                    required
                    autoFocus
                    rows={4}
                    placeholder="Describe your suggestion in detail..."
                    value={formData.content}
                    onChange={e => setFormData({...formData, content: e.target.value})}
                    className="w-full text-xs font-medium text-gray-900 placeholder:text-gray-400 outline-none resize-none bg-gray-50 border border-gray-300 rounded-xl p-3 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   <div className="flex flex-col gap-1">
                     <label className="text-gray-700">Tags (Comma separated)</label>
                     <input 
                       type="text" 
                       placeholder="e.g. Tax, Automation, Audit" 
                       value={formData.tags}
                       onChange={e => setFormData({...formData, tags: e.target.value})}
                       className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 outline-none focus:border-indigo-500"
                     />
                   </div>

                   <div className="flex flex-col gap-1">
                     <label className="text-gray-700">Assign Department</label>
                     <select 
                       value={formData.assignDepartment}
                       onChange={e => setFormData({...formData, assignDepartment: e.target.value})}
                       className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 outline-none focus:border-indigo-500 cursor-pointer"
                     >
                       <option value="All">All Departments</option>
                       {availableDepts.map(d => (
                         <option key={d} value={d}>{d}</option>
                       ))}
                     </select>
                   </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   <div className="flex flex-col gap-1">
                     <label className="text-gray-700">Visibility</label>
                     <select 
                       value={formData.visibility}
                       onChange={e => setFormData({...formData, visibility: e.target.value})}
                       className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 outline-none focus:border-indigo-500 cursor-pointer"
                     >
                       <option>Public (Workspace Visible)</option>
                       <option>Private (Leadership Only)</option>
                     </select>
                   </div>

                   <div className="flex flex-col gap-1">
                     <label className="text-gray-700">Attach Document (Optional)</label>
                     <label className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-300 rounded-xl text-gray-600 transition-colors cursor-pointer text-xs">
                        <Paperclip className="w-3.5 h-3.5" /> 
                        <span className="truncate max-w-[150px]">
                          {formData.attachment ? formData.attachment : 'Choose file...'}
                        </span>
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={e => {
                             const file = e.target.files[0];
                             if (file) setFormData({...formData, attachment: file.name});
                          }}
                        />
                     </label>
                   </div>
                </div>
              </form>
            </div>

            {/* Actions Footer */}
            <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
               <button
                 type="button"
                 onClick={() => setIsModalOpen(false)}
                 className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
               >
                 Cancel
               </button>
               <button 
                 form="idea-engine" 
                 type="submit" 
                 className="px-6 py-2.5 bg-[#0f766e] hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-700/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
               >
                 Post Idea
               </button>
            </div>

          </div>
        </div>
      )}

      {/* IDEA COMMENTS & DETAILS MODAL */}
      {activeIdeaView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col relative overflow-hidden">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gray-50/50">
               <div className="flex gap-4 w-full">
                 <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <Lightbulb className="w-5 h-5 text-amber-600" />
                 </div>
                 <div className="flex-1 pr-6">
                   <h2 className="text-lg font-black text-gray-900 leading-tight mb-1">{activeIdeaView.content}</h2>
                   <div className="text-xs font-bold text-gray-400">By {activeIdeaView.author} · {activeIdeaView.assignDepartment} Dept</div>
                 </div>
               </div>
               <button onClick={() => {setActiveIdeaView(null); setCommentInput('');}} className="p-1.5 bg-gray-100 text-gray-500 hover:bg-gray-900 rounded-full transition-colors shrink-0 absolute top-6 right-6">
                 <X className="w-5 h-5" />
               </button>
            </div>

            {/* Comments Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
               <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Discussion Thread ({activeIdeaView.comments || 0})
               </h3>
               
               <div className="space-y-4">
                 {activeIdeaView.commentList && activeIdeaView.commentList.length > 0 ? (
                   activeIdeaView.commentList.map((c) => (
                      <div key={c.id} className="bg-white border border-gray-100 p-4 rounded-xl shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-xs font-extrabold text-gray-900">{c.author}</span>
                           <span className="text-[10px] font-bold text-gray-400">{c.date}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-700">{c.text}</p>
                      </div>
                   ))
                 ) : (
                   <div className="text-center py-8 text-xs text-gray-400 font-bold border border-dashed border-gray-200 rounded-xl bg-gray-50">
                     No comments yet. Start the discussion!
                   </div>
                 )}
               </div>
            </div>

            {/* Post Comment Input */}
            <div className="p-4 border-t border-gray-100 bg-white">
               <form onSubmit={submitComment} className="flex gap-2">
                 <input 
                   type="text" 
                   required
                   autoFocus
                   placeholder="Write a comment..." 
                   value={commentInput}
                   onChange={e => setCommentInput(e.target.value)}
                   className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-2.5 text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                 />
                 <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors shadow-md flex items-center gap-2">
                   Post
                 </button>
               </form>
            </div>

          </div>
        </div>
      )}

      {/* CONVERSION MODAL */}
      {conversionModal.isOpen && conversionModal.targetIdea && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col relative overflow-hidden animate-slide-up">
            
            <div className={`p-6 border-b border-gray-100 flex items-center gap-3 ${conversionModal.type === 'task' ? 'bg-indigo-50/50' : 'bg-purple-50/50'}`}>
               <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${conversionModal.type === 'task' ? 'bg-indigo-100 text-indigo-600' : 'bg-purple-100 text-purple-600'}`}>
                 <Lightbulb className="w-5 h-5" />
               </div>
               <div className="flex-1">
                 <h2 className="text-xl font-black text-gray-900 leading-tight">
                   Convert to {conversionModal.type === 'task' ? 'Task' : 'Project'}
                 </h2>
                 <p className="text-xs font-bold text-gray-500">
                   Specify details to extract this idea into your workflow.
                 </p>
               </div>
               <button onClick={() => setConversionModal({isOpen:false, type:null, targetIdea:null})} className="p-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-full transition-colors shadow-sm self-start">
                 <X className="w-5 h-5" />
               </button>
            </div>

            <form onSubmit={submitConversion} className="p-6 flex flex-col gap-5 bg-white">
               
               <div>
                 <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                   {conversionModal.type === 'task' ? 'Title' : 'Project Name'}
                 </label>
                 <input 
                   type="text" 
                   required
                   value={conversionData.title}
                   onChange={e => setConversionData({...conversionData, title: e.target.value})}
                   className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-sm text-gray-900"
                 />
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Assignee / Owner</label>
                   <select 
                     value={conversionData.assignee}
                     onChange={e => setConversionData({...conversionData, assignee: e.target.value})}
                     className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-sm text-gray-700"
                   >
                     <option value="Unassigned">Unassigned</option>
                     {availableMembers.map(m => (
                       <option key={m} value={m}>{m}</option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Due Date</label>
                   <input 
                     type="date"
                     required
                     value={conversionData.dueDate}
                     onChange={e => setConversionData({...conversionData, dueDate: e.target.value})}
                     className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-sm text-gray-700"
                   />
                 </div>
               </div>

               <div>
                 <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Priority</label>
                 <div className="flex gap-2">
                   {['Low', 'Medium', 'High'].map(p => (
                     <button
                       key={p} type="button"
                       onClick={() => setConversionData({...conversionData, priority: p})}
                       className={`flex-1 py-2.5 rounded-lg text-xs font-bold border transition-colors ${
                         conversionData.priority === p ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                       }`}
                     >
                       {p}
                     </button>
                   ))}
                 </div>
               </div>

               <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-3">
                 <button 
                   type="button" 
                   onClick={() => setConversionModal({isOpen:false, type:null, targetIdea:null})}
                   className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50"
                 >
                   Cancel
                 </button>
                 <button 
                   type="submit" 
                   className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-600/30"
                 >
                   Execute
                 </button>
               </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
