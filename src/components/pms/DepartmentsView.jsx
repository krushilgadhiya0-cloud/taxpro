import React, { useState, useEffect } from 'react';
import { Building2, Plus, Bot, Users, HelpCircle, UserCog, CheckSquare, Edit, Trash2, ChevronLeft, ChevronRight, X, Download, Printer } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function DepartmentsView({ userRole, onShowToast }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeDeptStat, setActiveDeptStat] = useState(null);
  const [newDeptForm, setNewDeptForm] = useState({ name: 'Compliance', customName: '', isOther: false, desc: '', manager: '' });
  
  const [depts, setDepts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDepts();
  }, []);

  const fetchDepts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('departments').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        setDepts(data);
        localStorage.setItem('taxpro_departments', JSON.stringify(data));
      } else {
        const cached = localStorage.getItem('taxpro_departments');
        if (cached) {
          setDepts(JSON.parse(cached));
        } else if (Array.isArray(data)) {
          setDepts(data);
        }
      }
    } catch (e) {
      console.warn('[Departments Load Notice]:', e.message);
      const cached = localStorage.getItem('taxpro_departments');
      if (cached) setDepts(JSON.parse(cached));
    }
    setIsLoading(false);
  };

  const [availableManagers] = useState(() => {
    try {
      const saved = localStorage.getItem('taxpro_workload_team');
      if (saved) return JSON.parse(saved) || [];
    } catch(e) {}
    return [];
  });

  const [teamMembers] = useState(() => {
    try {
      const saved = localStorage.getItem('taxpro_team_members');
      if (saved) return JSON.parse(saved) || [];
    } catch(e) {}
    return [];
  });

  const uniqueManagersCount = new Set(
    (Array.isArray(depts) ? depts : []).map(d => d.manager).filter(m => m && m !== 'Not assigned' && m !== 'Unassigned')
  ).size;

  const [deleteId, setDeleteId] = useState(null);

  const handleAddDept = async (e) => {
    e.preventDefault();
    const finalName = newDeptForm.isOther ? newDeptForm.customName : newDeptForm.name;
    if (!finalName) return;
    
    const initials = finalName.split(' ').map(n => n.charAt(0).toUpperCase()).slice(0,2).join('');
    
    // Inject directly into Supabase Cloud
    const { data, error } = await supabase.from('departments').insert([
      {
        name: finalName,
        manager: newDeptForm.manager || 'Not assigned',
        initials: initials || 'D',
        description: newDeptForm.desc || 'Newly created department.'
      }
    ]).select();

    if (error) {
       console.error(error);
       if (onShowToast) onShowToast(`Upload Error: ${error.message}`, 'error');
       return;
    }

    setDepts(prev => [data[0], ...prev]);

    setIsAddModalOpen(false);
    setNewDeptForm({ name: 'Compliance', customName: '', isOther: false, desc: '', manager: '' });
    if (onShowToast) onShowToast(`Department ${finalName} created successfully!`, 'success');
  };

  const handleDownloadCSV = () => {
    const list = Array.isArray(depts) ? depts : [];
    if (list.length === 0) {
      if (onShowToast) onShowToast('No data to download.', 'error');
      return;
    }
    const csvRows = ['Name,Initials,Members,Manager,Description'];
    list.forEach(d => {
      csvRows.push(`"${d.name}","${d.initials}","${d.members || 0}","${d.manager || 'Unassigned'}","${d.description || d.desc}"`);
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `all_departments.csv`;
    link.click();
    if (onShowToast) onShowToast('All departments list downloaded successfully.', 'success');
  };

  const triggerPrint = () => {
    if (onShowToast) onShowToast('Preparing printable Departments view...', 'info');
    setTimeout(() => window.print(), 500);
  };

  const handleDownloadSingleDept = (dept) => {
    const csvRows = ['Name,Initials,Members,Manager,Description'];
    csvRows.push(`"${dept.name}","${dept.initials}","${dept.members || 0}","${dept.manager || 'Unassigned'}","${dept.description || dept.desc}"`);
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${dept.initials}_department.csv`;
    link.click();
    if (onShowToast) onShowToast(`Downloaded profile for ${dept.name}`, 'success');
  };

  const executeDelete = async () => {
    const { error } = await supabase.from('departments').delete().eq('id', deleteId);
    if (error) {
       if (onShowToast) onShowToast(`Error deleting: ${error.message}`, 'error');
       return;
    }
    setDepts(prev => prev.filter(d => d.id !== deleteId));
    setDeleteId(null);
    if (onShowToast) onShowToast('Department deleted.', 'info');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen text-gray-800 relative pb-24">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex items-center gap-3">
            <div className="p-4 bg-emerald-50 rounded-2xl w-14 h-14 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 font-outfit">Departments</h1>
              <p className="text-sm text-gray-500 mt-1">Manage and organize your departments</p>
            </div>
          </div>
          
          <div className="flex items-center gap-8 sm:ml-8 pt-2">
            <div>
              <div className="text-xl font-black text-gray-900">{depts.length}</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">DEPARTMENTS</div>
            </div>
            <div>
              <div className="text-xl font-black text-gray-900">{uniqueManagersCount}</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">MANAGERS</div>
            </div>
            <div>
              <div className="text-xl font-black text-gray-900">{teamMembers.length}</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">MEMBERS</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button 
            onClick={triggerPrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-700 font-bold text-sm shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" /> Print All
          </button>
          <button 
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-700 font-bold text-sm shadow-sm transition-all"
          >
            <Download className="w-4 h-4" /> Download All
          </button>
          {userRole === 'Admin' && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0f766e] hover:bg-teal-800 text-white font-bold text-sm shadow-md transition-all"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          )}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 mb-10">
        
        {(Array.isArray(depts) ? depts : []).map((d) => (
          <div 
            key={d.id} 
            onClick={() => setActiveDeptStat(d)}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-1 hover:border-emerald-200 transition-all cursor-pointer group/card"
          >
            <div className="h-2 w-full bg-[#0f766e] group-hover/card:bg-emerald-500 transition-colors"></div>
            
            <div className="p-6 flex-1 flex flex-col pointer-events-none">
              <div className="flex items-start gap-4 mb-4 group">
                <div className="w-12 h-12 rounded-xl bg-[#0f766e] text-white flex items-center justify-center font-bold font-outfit shadow-sm">
                  {d.initials}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg group-hover:text-emerald-700 transition-colors">{d.name}</h3>
                  <div className="flex items-center gap-1.5 text-gray-400 mt-1">
                    <Users className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">{d.members}</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-6 flex-1 pr-4 leading-relaxed">
                {d.description || d.desc}
              </p>

              <div className="flex items-center gap-3 bg-gray-50/80 border border-gray-100 p-3 rounded-2xl mb-2 pointer-events-auto">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200">
                  <UserCog className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">MANAGER</div>
                  <div className="text-xs font-bold text-indigo-900">{d.manager || 'Not assigned'}</div>
                </div>
              </div>
            </div>

            <div className="px-3 py-3 border-t border-gray-50 flex items-center justify-between text-gray-400">
               <div className="flex items-center gap-4 text-[11px] font-bold">
                 <button onClick={(e) => { e.stopPropagation(); setActiveDeptStat(d); }} className="flex items-center gap-1.5 hover:text-gray-700 transition-colors">
                   <CheckSquare className="w-3.5 h-3.5" /> View Stats
                 </button>
                 <button onClick={(e) => { e.stopPropagation(); handleDownloadSingleDept(d); }} className="flex items-center gap-1.5 hover:text-emerald-600 transition-colors">
                   <Download className="w-3.5 h-3.5" /> Download
                 </button>
               </div>
               
               {userRole === 'Admin' && (
                 <button onClick={(e) => { e.stopPropagation(); setDeleteId(d.id); }} className="p-1.5 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                   <Trash2 className="w-4 h-4" />
                 </button>
               )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Nav Bar */}
      <div className="bg-white rounded-t-3xl sm:rounded-full border border-gray-100 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.05)] p-2 sm:p-1 absolute bottom-0 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[95%] max-w-6xl flex justify-end">
        <div className="flex items-center gap-2 bg-gray-50 rounded-full border border-gray-100 p-1">
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-4 py-1.5 bg-[#0f766e] text-white text-xs font-bold rounded-full">
            1 / 1
          </div>
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 cursor-not-allowed">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CREATE NEW DEPARTMENT MODAL */}
      {isAddModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddModalOpen(false); }}
          className="modal-overlay-backdrop"
        >
          <div className="modal-content-box max-w-2xl">
            {/* Premium Gradient Header */}
            <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-xs">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-white tracking-tight">
                    Add Department
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Create a new organizational branch & management scope
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
            
            <form onSubmit={handleAddDept} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold scrollbar-thin">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Column 1: Identity & Manager */}
                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className="text-gray-700 block mb-1">Department Name <span className="text-red-500">*</span></label>
                    <select
                      value={newDeptForm.isOther ? 'Other' : newDeptForm.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'Other') {
                          setNewDeptForm({ ...newDeptForm, name: '', isOther: true });
                        } else {
                          setNewDeptForm({ ...newDeptForm, name: val, isOther: false });
                        }
                      }}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all font-medium text-xs text-gray-900 cursor-pointer"
                    >
                      <option value="Compliance">Compliance</option>
                      <option value="Tax & Audit">Tax & Audit</option>
                      <option value="Accounting">Accounting</option>
                      <option value="Legal & Advisory">Legal & Advisory</option>
                      <option value="Outsourcing">Outsourcing</option>
                      <option value="HR & Admin">HR & Admin</option>
                      <option value="Sales & Marketing">Sales & Marketing</option>
                      <option value="IT Support">IT Support</option>
                      <option value="Other">Other (Custom)</option>
                    </select>
                    
                    {newDeptForm.isOther && (
                      <input 
                        required 
                        type="text"
                        value={newDeptForm.customName}
                        onChange={e => setNewDeptForm({...newDeptForm, customName: e.target.value})}
                        placeholder="Enter custom department name..."
                        className="w-full px-3 py-2.5 bg-white border border-indigo-300 rounded-xl outline-none focus:border-indigo-500 transition-all font-medium text-xs text-gray-900 mt-2 animate-fade-in"
                      />
                    )}
                  </div>

                  <div>
                    <label className="text-gray-700 block mb-1">Assign Manager (Optional)</label>
                    <div className="relative">
                      <UserCog className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select 
                        value={newDeptForm.manager}
                        onChange={e => setNewDeptForm({...newDeptForm, manager: e.target.value})}
                        className="w-full px-3 py-2.5 pl-9 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-medium text-xs text-gray-900 cursor-pointer"
                      >
                        <option value="">Leave Unassigned</option>
                        {availableManagers.map(m => (
                          <option key={m.id} value={m.name}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Column 2: Scope & Function */}
                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className="text-gray-700 block mb-1">Department Description & Scope <span className="text-red-500">*</span></label>
                    <textarea 
                      required 
                      rows={5}
                      value={newDeptForm.desc}
                      onChange={e => setNewDeptForm({...newDeptForm, desc: e.target.value})}
                      placeholder="What is this department's primary function, responsibilities, and operational scope?"
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 resize-none text-xs text-gray-800 min-h-[110px]"
                    />
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
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteId && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteId(null); }}
          className="modal-overlay-backdrop"
        >
          <div className="modal-content-box max-w-sm p-6 text-center border border-red-100 dark:border-red-900/30 animate-shake">
            <h3 className="text-xl font-extrabold text-gray-900 mb-2">Delete Department</h3>
            <p className="text-sm text-gray-500 mb-6 font-medium">Are you sure you want to permanently disband this department? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={executeDelete} className="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* DEPT STATS MODAL */}
      {activeDeptStat && (
        <div className="modal-overlay-backdrop z-[60]" onClick={() => setActiveDeptStat(null)}>
          <div 
            className="modal-content-box max-w-xl border border-gray-100"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-[#0f766e] to-[#042f2e] w-full p-8 pb-10">
               <button onClick={() => setActiveDeptStat(null)} className="absolute top-4 right-4 p-2 bg-black/10 text-white rounded-full hover:bg-black/20 transition-colors">
                 <X className="w-4 h-4" />
               </button>
               
               <div className="flex items-center gap-4">
                 <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white font-black text-2xl shadow-inner border border-white/20">
                    {activeDeptStat.initials}
                 </div>
                 <div className="text-white">
                   <h3 className="font-extrabold text-2xl tracking-tight leading-none mb-1">{activeDeptStat.name}</h3>
                   <div className="flex items-center gap-2 text-emerald-100 text-sm font-semibold">
                      <Building2 className="w-3.5 h-3.5" /> Operations Branch
                   </div>
                 </div>
               </div>
            </div>

            {/* Stats Body */}
            <div className="px-6 pb-6 -mt-4 z-10 relative">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                 
                 <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                    <div className="text-gray-400 text-[9px] font-bold uppercase tracking-widest mb-1">Members</div>
                    <div className="text-2xl font-black text-gray-900 leading-none">{activeDeptStat.members}</div>
                 </div>

                 <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                    <div className="text-gray-400 text-[9px] font-bold uppercase tracking-widest mb-1">Total Tasks</div>
                    <div className="text-2xl font-black text-indigo-600 leading-none">0</div>
                 </div>

                 <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                    <div className="text-gray-400 text-[9px] font-bold uppercase tracking-widest mb-1">Previous</div>
                    <div className="text-2xl font-black text-emerald-500 leading-none">0</div>
                 </div>

                 <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center bg-gray-50/50">
                    <div className="text-gray-400 text-[9px] font-bold uppercase tracking-widest mb-1">Roles</div>
                    <div className="text-2xl font-black text-gray-500 leading-none">{(activeDeptStat.members > 0 ? (activeDeptStat.members > 2 ? 3 : 2) : 1)}</div>
                 </div>

              </div>

              {/* Manager Assignment UI */}
              {userRole === 'Admin' && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2 mb-3">
                    <UserCog className="w-4 h-4 text-indigo-600" /> Assign Manager
                  </label>
                  <div className="relative">
                    <select 
                      value={activeDeptStat.manager || ''}
                      onChange={(e) => {
                        const newManager = e.target.value;
                        setDepts(prev => prev.map(d => d.id === activeDeptStat.id ? { ...d, manager: newManager } : d));
                        setActiveDeptStat({...activeDeptStat, manager: newManager});
                        if (onShowToast) onShowToast(`Manager updated to ${newManager || 'Unassigned'}`, 'success');
                      }}
                      className="w-full bg-white px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 outline-none focus:border-indigo-500 shadow-sm appearance-none cursor-pointer"
                    >
                      <option value="">Leave Unassigned</option>
                      {availableManagers.map(m => (
                        <option key={m.id} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 font-medium">Managers have elevated permissions to dispatch bulk assignations to members within this department scope.</p>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center gap-3">
               <button 
                 onClick={() => handleDownloadSingleDept(activeDeptStat)}
                 className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
               >
                 <Download className="w-4 h-4" /> Download Profile
               </button>
               <button 
                 onClick={() => setActiveDeptStat(null)}
                 className="flex-1 py-2.5 bg-[#0f766e] text-white text-sm font-bold rounded-xl shadow-md hover:bg-teal-800 transition-all"
               >
                 Done
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
