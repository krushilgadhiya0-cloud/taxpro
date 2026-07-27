import React, { useState } from 'react';
import { Lightbulb, Plus, Filter, ThumbsUp, ThumbsDown, MessageSquare, Paperclip, Lock, Globe, RefreshCcw, User, Tag, X } from 'lucide-react';

export default function IdeasView({ onShowToast }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ideas, setIdeas] = useState(() => {
    try {
      const saved = localStorage.getItem('taxpro_ideas');
      if (saved) return JSON.parse(saved) || [];
    } catch (e) {}
    return [];
  });

  React.useEffect(() => {
    localStorage.setItem('taxpro_ideas', JSON.stringify(ideas));
  }, [ideas]);

  const [formData, setFormData] = useState({
    content: '',
    tags: '',
    autoConvert: 'Manual',
    assignDepartment: 'All',
    visibility: 'Public' // Public or Private
  });

  const handleAddIdea = (e) => {
    e.preventDefault();
    if (!formData.content) return;
    
    setIdeas(prev => [
      {
        id: Date.now(),
        title: "What's on your mind?",
        content: formData.content,
        author: 'Current User',
        upvotes: 0,
        downvotes: 0,
        status: 'New',
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        visibility: formData.visibility,
        comments: 0
      },
      ...prev
    ]);
    
    setIsModalOpen(false);
    setFormData({ content: '', tags: '', autoConvert: 'Manual', assignDepartment: 'All', visibility: 'Public' });
    if (onShowToast) onShowToast('Idea dropped successfully to the board.', 'success');
  };

  const handleAction = (id, actionType) => {
    setIdeas(prev => prev.map(idea => {
      if (idea.id === id) {
        if (actionType === 'upvote') return { ...idea, upvotes: idea.upvotes + 1 };
        if (actionType === 'downvote') return { ...idea, downvotes: idea.downvotes + 1 };
        if (actionType === 'comment') {
           const newComment = window.prompt("Type your comment:");
           if (newComment && newComment.trim()) {
             if (onShowToast) onShowToast('Comment added successfully!', 'success');
             return { ...idea, comments: idea.comments + 1 };
           }
           return idea;
        }
        if (actionType === 'implement') {
           if (onShowToast) onShowToast('Idea marked as Implemented.', 'success');
           return { ...idea, status: 'Implemented' };
        }
        if (actionType === 'convert_task') {
           if (onShowToast) onShowToast('Idea successfully converted into an active Task.', 'success');
           return { ...idea, status: 'Converted to Task' };
        }
        if (actionType === 'convert_project') {
           if (onShowToast) onShowToast('Idea structured into a new Project footprint.', 'success');
           return { ...idea, status: 'Converted to Project' };
        }
      }
      return idea;
    }));
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
               </div>
               
               <span className={`text-[10px] uppercase tracking-widest font-extrabold px-2.5 py-1 rounded-md border ${
                 idea.status === 'New' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                 idea.status === 'Under Review' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                 idea.status === 'Implemented' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                 (idea.status.includes('Converted')) ? 'bg-purple-50 text-purple-700 border-purple-200' :
                 'bg-emerald-50 text-emerald-700 border-emerald-100'
               }`}>
                 {idea.status}
               </span>
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
                   onClick={() => handleAction(idea.id, 'implement')}
                   disabled={idea.status === 'Implemented'}
                   className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] uppercase tracking-wider font-extrabold rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                 >
                   Implement
                 </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-slide-up">
            
            <div className="flex flex-col p-6 pb-2 relative">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-1.5 bg-gray-100 text-gray-500 hover:text-gray-900 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1 pt-1">
                  <h2 className="text-xl font-black text-gray-900 mb-1">What's on your mind?</h2>
                  <p className="text-xs font-medium text-gray-500 mb-6">Drop your suggestions, features, and feedback here.</p>
                  
                  <form id="idea-engine" onSubmit={handleAddIdea} className="flex flex-col gap-5">
                    
                    {/* Main Input Textarea */}
                    <div>
                      <textarea 
                        required
                        autoFocus
                        rows={5}
                        placeholder="Type your idea..."
                        value={formData.content}
                        onChange={e => setFormData({...formData, content: e.target.value})}
                        className="w-full text-base sm:text-lg font-medium text-gray-900 placeholder:text-gray-400 outline-none resize-none bg-transparent"
                      />
                    </div>

                    {/* Rich Meta Row */}
                    <div className="grid border-y border-gray-100 border-dashed py-4 gap-4 grid-cols-1 sm:grid-cols-2">
                       
                       <div className="flex flex-col gap-1.5">
                         <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1"><Tag className="w-3 h-3" /> Tags (Comma separated)</label>
                         <input 
                           type="text" 
                           placeholder="Finance, Marketing..." 
                           value={formData.tags}
                           onChange={e => setFormData({...formData, tags: e.target.value})}
                           className="bg-gray-100 border-none rounded-lg px-3 py-2 text-xs font-bold text-gray-700 outline-none"
                         />
                       </div>

                       <div className="flex flex-col gap-1.5">
                         <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1"><User className="w-3 h-3" /> Assign Department</label>
                         <select 
                           value={formData.assignDepartment}
                           onChange={e => setFormData({...formData, assignDepartment: e.target.value})}
                           className="bg-gray-100 border-none rounded-lg px-3 py-2 text-xs font-bold text-gray-700 outline-none cursor-pointer"
                         >
                           <option>All</option>
                           <option>Engineering</option>
                           <option>Design</option>
                           <option>Sales</option>
                         </select>
                       </div>
                       
                       <div className="flex flex-col gap-1.5">
                         <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1"><RefreshCcw className="w-3 h-3" /> Auto Convert Task</label>
                         <select 
                           value={formData.autoConvert}
                           onChange={e => setFormData({...formData, autoConvert: e.target.value})}
                           className="bg-gray-100 border-none rounded-lg px-3 py-2 text-xs font-bold text-gray-700 outline-none cursor-pointer"
                         >
                           <option>Manual Conversion</option>
                           <option>After 3 Days</option>
                           <option>After 1 Week</option>
                           <option>100+ Upvotes triggers</option>
                         </select>
                       </div>

                       <div className="flex flex-col gap-1.5">
                         <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1"><Globe className="w-3 h-3" /> Visibility</label>
                         <select 
                           value={formData.visibility}
                           onChange={e => setFormData({...formData, visibility: e.target.value})}
                           className="bg-gray-100 border-none rounded-lg px-3 py-2 text-xs font-bold text-gray-700 outline-none cursor-pointer"
                         >
                           <option>Public</option>
                           <option>Private</option>
                         </select>
                       </div>

                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
               
               {/* Attachments Trigger mock */}
               <button type="button" onClick={() => onShowToast && onShowToast('Select attachment from device...', 'info')} className="flex items-center gap-1.5 px-4 py-2 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors">
                  <Paperclip className="w-4 h-4" /> <span className="text-xs font-bold hidden sm:inline">Attach Files</span>
               </button>

               <button 
                 form="idea-engine" 
                 type="submit" 
                 className="px-8 py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-extrabold text-sm transition-colors shadow-lg shadow-gray-900/20"
               >
                 Post Idea
               </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
