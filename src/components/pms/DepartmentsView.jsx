import React, { useState, useEffect, useMemo } from 'react';
import { Building2, Plus, Bot, Users, HelpCircle, UserCog, CheckSquare, Edit, Trash2, ChevronLeft, ChevronRight, X, Download, Printer, Search, Save, Edit2, ShieldCheck, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { logAuditActivity } from '../../lib/auditLogger';
import { printHtml } from '../../lib/printHelper';

export default function DepartmentsView({ userRole: propRole, onShowToast }) {
  const userRole = (propRole || localStorage.getItem('taxpro_user_role') || 'Admin');
  const effectiveRole = userRole;
  const canManageDepts = effectiveRole === 'Super Admin' || effectiveRole === 'Admin' || effectiveRole === 'Administrator' || effectiveRole === 'Manager' || !effectiveRole.toLowerCase().includes('employee');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [activeDeptStat, setActiveDeptStat] = useState(null);
  const [newDeptForm, setNewDeptForm] = useState({ name: 'Compliance', customName: '', isOther: false, desc: '', manager: '' });
  const [searchQuery, setSearchQuery] = useState('');
  
  const [depts, setDepts] = useState([]);
  const [teamMembersList, setTeamMembersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDepts();
  }, []);

  const fetchDepts = async () => {
    setIsLoading(true);
    try {
      const [deptRes, teamRes] = await Promise.all([
        supabase.from('departments').select('*').order('created_at', { ascending: false }),
        supabase.from('team_members').select('*').order('created_at', { ascending: false })
      ]);

      if (teamRes.data && Array.isArray(teamRes.data)) {
        setTeamMembersList(teamRes.data);
      }

      const data = deptRes.data;
      if (!deptRes.error && Array.isArray(data) && data.length > 0) {
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

  const availableManagers = useMemo(() => {
    if (teamMembersList && teamMembersList.length > 0) {
      return teamMembersList;
    }
    try {
      const saved = localStorage.getItem('taxpro_team_members') || localStorage.getItem('taxpro_workload_team');
      if (saved) return JSON.parse(saved) || [];
    } catch(e) {}
    return [];
  }, [teamMembersList]);

  const uniqueManagersCount = new Set(
    (Array.isArray(depts) ? depts : []).map(d => d.manager).filter(m => m && m !== 'Not assigned' && m !== 'Unassigned')
  ).size;

  const [deleteId, setDeleteId] = useState(null);

  const getMembersForDept = (deptName) => {
    if (!deptName) return [];
    const term = deptName.toLowerCase();
    return teamMembersList.filter(m => 
      (m.department && m.department.toLowerCase() === term) ||
      (m.role && m.role.toLowerCase().includes(term))
    );
  };

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
    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

    logAuditActivity({
      action: 'ADD_DEPARTMENT',
      module: 'Departments',
      details: `Created new Department "${finalName}" with Manager "${newDeptForm.manager || 'Unassigned'}"`,
      metadata: { name: finalName, manager: newDeptForm.manager }
    });

    if (onShowToast) onShowToast(`Department ${finalName} created successfully!`, 'success');
  };

  const handleEditDeptSubmit = async (e) => {
    e.preventDefault();
    if (!editingDept || !editingDept.name) return;

    try {
      const { error } = await supabase.from('departments').update({
        name: editingDept.name.trim(),
        manager: editingDept.manager || 'Not assigned',
        initials: editingDept.initials || editingDept.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase(),
        description: editingDept.description || editingDept.desc || ''
      }).eq('id', editingDept.id);

      if (error) throw error;

      logAuditActivity({
        action: 'UPDATE_DEPARTMENT',
        module: 'Departments',
        details: `Updated Department details for "${editingDept.name}" (Manager: ${editingDept.manager || 'Unassigned'})`,
        metadata: { id: editingDept.id, name: editingDept.name }
      });

      setDepts(prev => prev.map(d => d.id === editingDept.id ? { 
        ...d,
        name: editingDept.name.trim(),
        manager: editingDept.manager || 'Not assigned',
        initials: editingDept.initials || editingDept.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase(),
        description: editingDept.description || editingDept.desc || ''
      } : d));
      if (activeDeptStat && activeDeptStat.id === editingDept.id) {
        setActiveDeptStat({ ...activeDeptStat, ...editingDept });
      }
      setEditingDept(null);
      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
      if (onShowToast) onShowToast(`✓ Department "${editingDept.name}" updated successfully!`, 'success');
    } catch (err) {
      if (onShowToast) onShowToast(`Update Error: ${err.message}`, 'error');
    }
  };

  const handleDownloadCSV = () => {
    const list = Array.isArray(depts) ? depts : [];
    if (list.length === 0) {
      if (onShowToast) onShowToast('No data to download.', 'error');
      return;
    }
    const csvRows = ['Name,Initials,Members,Manager,Assigned_Staff,Description'];
    list.forEach(d => {
      const assigned = getMembersForDept(d.name);
      const memberNames = assigned.map(m => m.name).join('; ');
      csvRows.push(`"${d.name}","${d.initials}","${assigned.length || d.members || 0}","${d.manager || 'Unassigned'}","${memberNames}","${d.description || d.desc}"`);
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `taxpro_all_departments_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    if (onShowToast) onShowToast('All departments list downloaded successfully.', 'success');
  };

  const handlePrintAllDepartments = () => {
    const list = filteredDepts.length > 0 ? filteredDepts : depts;
    if (list.length === 0) {
      if (onShowToast) onShowToast('No departments available to print.', 'warning');
      return;
    }

    const deptRowsHtml = list.map((d, index) => {
      const assigned = getMembersForDept(d.name);
      const count = assigned.length > 0 ? assigned.length : (d.members || d.head_count || 0);
      const memberNames = assigned.length > 0 
        ? assigned.map(m => m.name).join(', ') 
        : (count > 0 ? `${count} Active Personnel` : 'General Pool Resources');

      return `
        <tr>
          <td style="text-align: center; color: #6b7280; font-family: monospace;">${index + 1}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="background: #0f766e; color: white; padding: 3px 6px; border-radius: 4px; font-weight: 900; font-size: 10px; font-family: monospace;">${d.initials || 'DEP'}</span>
              <strong style="color: #111827; font-size: 11.5px;">${d.name}</strong>
            </div>
          </td>
          <td>
            <span style="font-weight: 700; color: ${d.manager && d.manager !== 'Not assigned' && d.manager !== 'Unassigned' ? '#0f766e' : '#6b7280'};">
              ${d.manager || 'Unassigned / Managing Partner'}
            </span>
          </td>
          <td style="text-align: center;">
            <span style="background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 10.5px;">
              ${count}
            </span>
          </td>
          <td style="color: #374151; font-size: 10px; line-height: 1.35;">
            ${memberNames}
          </td>
          <td style="color: #4b5563; font-size: 10px; line-height: 1.35;">
            ${d.description || d.desc || 'Operational division responsible for client deliverables and compliance.'}
          </td>
          <td style="text-align: center;">
            <span style="background: #ecfdf5; color: #047857; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 9px; text-transform: uppercase;">
              Active
            </span>
          </td>
        </tr>
      `;
    }).join('');

    const bodyHtml = `
      <div style="margin-bottom: 12px; font-weight: 800; font-size: 13px; color: #1e293b;">
        Practice Departments & Operational Divisions (${list.length} Functional Areas)
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="padding: 8px; border: 1px solid #e2e8f0; width: 35px; text-align: center;">#</th>
            <th style="padding: 8px; border: 1px solid #e2e8f0;">Department Name</th>
            <th style="padding: 8px; border: 1px solid #e2e8f0;">Managing Head</th>
            <th style="padding: 8px; border: 1px solid #e2e8f0; width: 70px; text-align: center;">Personnel</th>
            <th style="padding: 8px; border: 1px solid #e2e8f0;">Allocated Members</th>
            <th style="padding: 8px; border: 1px solid #e2e8f0;">Functional Responsibilities</th>
            <th style="padding: 8px; border: 1px solid #e2e8f0; width: 60px; text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${deptRowsHtml}
        </tbody>
      </table>
    `;

    printHtml('Departments Register', bodyHtml);
    if (onShowToast) onShowToast('🖨️ Generating printable departments register...', 'info');
  };

  const handlePrintSingleDept = (dept) => {
    if (!dept) return;

    const assigned = getMembersForDept(dept.name);
    const count = assigned.length > 0 ? assigned.length : (dept.members || dept.head_count || 0);

    const bodyHtml = `
      <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 14px; margin-bottom: 16px; display: flex; align-items: center; gap: 14px;">
        <div style="background: #0f766e; color: white; width: 44px; height: 44px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 900;">
          ${dept.initials || 'DEP'}
        </div>
        <div>
          <div style="font-size: 18px; font-weight: 800; color: #0f766e;">${dept.name}</div>
          <div style="font-size: 11px; color: #115e59; margin-top: 2px;">Managing Head: <strong>${dept.manager || 'Unassigned / Managing Partner'}</strong></div>
        </div>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 14px;">
        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">Department Functional Scope</div>
        <p style="font-size: 11.5px; line-height: 1.5; color: #334155; margin: 0;">
          ${dept.description || dept.desc || 'Core functional division managing practice workflows, client deliverables, and professional compliance.'}
        </p>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 14px;">
        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">Allocated Team Members (${count} Total)</div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          ${assigned.length > 0 
            ? assigned.map(m => `<span style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold;">👤 ${m.name} (${m.role || 'Member'})</span>`).join('') 
            : `<span style="font-size: 11px; color: #64748b;">No dedicated staff exclusively mapped. Operates with general practice pool resources.</span>`
          }
        </div>
      </div>
    `;

    printHtml(`Department Dossier - ${dept.name}`, bodyHtml);
    if (onShowToast) onShowToast(`🖨️ Generating printable dossier for ${dept.name}...`, 'info');
  };

  const handleDownloadSingleDept = (dept) => {
    const assigned = getMembersForDept(dept.name);
    const csvRows = ['Name,Initials,Members,Manager,Assigned_Staff,Description'];
    csvRows.push(`"${dept.name}","${dept.initials}","${assigned.length || dept.members || 0}","${dept.manager || 'Unassigned'}","${assigned.map(m=>m.name).join('; ')}","${dept.description || dept.desc}"`);
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${dept.initials || 'dept'}_department_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    if (onShowToast) onShowToast(`Downloaded profile for ${dept.name}`, 'success');
  };

  const executeDelete = async () => {
    const deptToDelete = depts.find(d => d.id === deleteId);
    const { error } = await supabase.from('departments').delete().eq('id', deleteId);
    if (error) {
       if (onShowToast) onShowToast(`Error deleting: ${error.message}`, 'error');
       return;
    }

    logAuditActivity({
      action: 'DELETE_DEPARTMENT',
      module: 'Departments',
      details: `Removed Department "${deptToDelete?.name || deleteId}" from practice structure`,
      metadata: { id: deleteId, name: deptToDelete?.name }
    });

    setDepts(prev => prev.filter(d => d.id !== deleteId));
    setDeleteId(null);
    if (onShowToast) onShowToast('Department deleted.', 'info');
  };

  const filteredDepts = depts.filter(d => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      (d.name && d.name.toLowerCase().includes(term)) ||
      (d.manager && d.manager.toLowerCase().includes(term)) ||
      (d.description && d.description.toLowerCase().includes(term)) ||
      (d.desc && d.desc.toLowerCase().includes(term))
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen text-gray-800 relative pb-24">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex items-center gap-3">
            <div className="p-4 bg-emerald-50 rounded-2xl w-14 h-14 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 font-outfit">Departments</h1>
              <p className="text-sm text-gray-500 mt-1">Manage, organize and review your organizational branches</p>
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
              <div className="text-xl font-black text-gray-900">{teamMembersList.length}</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">MEMBERS</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button 
            onClick={handlePrintAllDepartments}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-700 font-bold text-sm shadow-xs transition-all cursor-pointer"
            title="Print All Departments Master Register"
          >
            <Printer className="w-4 h-4" /> Print All
          </button>
          <button 
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-700 font-bold text-sm shadow-xs transition-all cursor-pointer"
            title="Download CSV"
          >
            <Download className="w-4 h-4" /> Download All
          </button>
          {canManageDepts && (
            <button 
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0f766e] hover:bg-teal-800 text-white font-bold text-sm shadow-md shadow-teal-900/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" /> Add Department
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-4 mb-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
          <Building2 className="w-4 h-4 text-emerald-600" />
          <span>Active Divisions: <span className="text-[#0f766e] font-black">{filteredDepts.length}</span></span>
        </div>

        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search Department Name, Head, or Operational Scope..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:bg-white focus:border-emerald-500 font-medium"
          />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 mb-10">
        
        {filteredDepts.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-gray-200 border-dashed p-8 shadow-xs flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
              <Building2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-gray-900 mb-1">No Departments Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mb-4 leading-relaxed">
              {searchQuery ? `No functional divisions match "${searchQuery}".` : 'Create your practice departments to organize workflow assignments, managing heads, and member mapping.'}
            </p>
            {canManageDepts && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-[#0f766e] hover:bg-teal-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> + Create First Department
              </button>
            )}
          </div>
        ) : (
          filteredDepts.map((d) => {
            const assigned = getMembersForDept(d.name);
            const memberCount = assigned.length > 0 ? assigned.length : (d.members || d.head_count || 0);

            return (
              <div 
                key={d.id} 
                onClick={() => setActiveDeptStat(d)}
                className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-0.5 hover:border-emerald-200 transition-all cursor-pointer group/card"
              >
                <div className="h-2 w-full bg-[#0f766e] group-hover/card:bg-emerald-500 transition-colors"></div>
                
                <div className="p-6 flex-1 flex flex-col pointer-events-none">
                  <div className="flex items-start justify-between gap-4 mb-4 group">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#0f766e] text-white flex items-center justify-center font-bold font-outfit shadow-xs shrink-0">
                        {d.initials || 'DEP'}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg group-hover:text-emerald-700 transition-colors">{d.name}</h3>
                        <div className="flex items-center gap-1.5 text-gray-400 mt-1">
                          <Users className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">{memberCount} Member{memberCount === 1 ? '' : 's'}</span>
                        </div>
                      </div>
                    </div>

                    {canManageDepts && (
                      <div className="flex items-center gap-1 pointer-events-auto">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDept(d);
                          }}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Department"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(d.id);
                          }}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Department"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mb-5 flex-1 pr-4 leading-relaxed line-clamp-3">
                    {d.description || d.desc || 'Core functional division managing practice workflows and compliance deliverables.'}
                  </p>

                  <div className="flex items-center gap-3 bg-gray-50/90 border border-gray-100 p-3 rounded-2xl mb-2 pointer-events-auto">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center border border-emerald-200 shrink-0">
                      <UserCog className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">DEPARTMENT HEAD</div>
                      <div className="text-xs font-bold text-gray-900 truncate">{d.manager || 'Not assigned / Managing Partner'}</div>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-gray-500 bg-gray-50/50">
                   <div className="flex items-center gap-4 text-xs font-bold">
                     <button onClick={(e) => { e.stopPropagation(); setActiveDeptStat(d); }} className="flex items-center gap-1.5 hover:text-emerald-700 transition-colors cursor-pointer">
                       <CheckSquare className="w-3.5 h-3.5" /> View Dossier
                     </button>
                     <button onClick={(e) => { e.stopPropagation(); handlePrintSingleDept(d); }} className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors cursor-pointer">
                       <Printer className="w-3.5 h-3.5" /> Print
                     </button>
                     <button onClick={(e) => { e.stopPropagation(); handleDownloadSingleDept(d); }} className="flex items-center gap-1.5 hover:text-emerald-600 transition-colors cursor-pointer">
                       <Download className="w-3.5 h-3.5" /> CSV
                     </button>
                   </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Nav Bar */}
      <div className="bg-white rounded-t-3xl sm:rounded-full border border-gray-100 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.05)] p-2 sm:p-1 absolute bottom-0 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[95%] max-w-6xl flex justify-between items-center px-6">
        <div className="text-xs font-bold text-gray-500">
          Showing <span className="text-[#0f766e]">{filteredDepts.length}</span> of <span className="text-gray-900">{depts.length}</span> Departments
        </div>
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
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-slate-900 tracking-tight">
                    Add Department
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Create a new organizational branch & management scope
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
            
            <form onSubmit={handleAddDept} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold overscroll-contain chat-custom-scrollbar">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Column 1: Identity & Manager */}
                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className="text-slate-700 block mb-1">Department Name <span className="text-rose-500">*</span></label>
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
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-emerald-600 transition-all font-semibold text-xs text-slate-900 cursor-pointer shadow-2xs"
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
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl outline-none focus:border-emerald-600 transition-all font-medium text-xs text-slate-900 mt-2 shadow-2xs"
                      />
                    )}
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1">Assign Manager (Optional)</label>
                    <div className="relative">
                      <UserCog className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select 
                        value={newDeptForm.manager}
                        onChange={e => setNewDeptForm({...newDeptForm, manager: e.target.value})}
                        className="w-full px-3 py-2 pl-9 bg-white border border-slate-300 rounded-xl outline-none focus:border-emerald-600 font-medium text-xs text-slate-900 cursor-pointer shadow-2xs"
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
                    <label className="text-slate-700 block mb-1">Department Description & Scope <span className="text-rose-500">*</span></label>
                    <textarea 
                      required 
                      rows={5}
                      value={newDeptForm.desc}
                      onChange={e => setNewDeptForm({...newDeptForm, desc: e.target.value})}
                      placeholder="What is this department's primary function, responsibilities, and operational scope?"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-emerald-600 resize-none text-xs text-slate-800 min-h-[110px] shadow-2xs"
                    />
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DEPARTMENT MODAL */}
      {editingDept && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setEditingDept(null); }}
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-slate-900 tracking-tight">
                    Edit Department: {editingDept.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update department title, head of division & functional scope
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setEditingDept(null)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditDeptSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold overscroll-contain chat-custom-scrollbar">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className="text-slate-700 block mb-1">Department Name <span className="text-rose-500">*</span></label>
                    <input 
                      type="text" 
                      required 
                      value={editingDept.name || ''} 
                      onChange={e => setEditingDept({...editingDept, name: e.target.value})} 
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-emerald-600 text-xs font-semibold text-slate-900 shadow-2xs" 
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1">Department Head / Manager</label>
                    <div className="relative">
                      <UserCog className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select 
                        value={editingDept.manager || ''} 
                        onChange={e => setEditingDept({...editingDept, manager: e.target.value})} 
                        className="w-full px-3 py-2 pl-9 bg-white border border-slate-300 rounded-xl outline-none focus:border-emerald-600 font-medium text-xs text-slate-900 cursor-pointer shadow-2xs"
                      >
                        <option value="">Leave Unassigned</option>
                        {availableManagers.map(m => (
                          <option key={m.id} value={m.name}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className="text-slate-700 block mb-1">Operational Scope & Description</label>
                    <textarea 
                      rows={5} 
                      value={editingDept.description || editingDept.desc || ''} 
                      onChange={e => setEditingDept({...editingDept, description: e.target.value, desc: e.target.value})} 
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-emerald-600 resize-none text-xs text-slate-800 min-h-[110px] shadow-2xs" 
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 -mx-6 -mb-6 mt-3">
                <button 
                  type="button" 
                  onClick={() => setEditingDept(null)} 
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Save Changes
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
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 text-center my-auto animate-modal-smooth">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 border border-rose-100 shadow-2xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1 font-outfit">Delete Department</h3>
            <p className="text-xs text-slate-500 mb-5 font-medium leading-relaxed">Are you sure you want to permanently disband this department? This action cannot be undone.</p>
            <div className="flex gap-2.5">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2 rounded-xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">Cancel</button>
              <button onClick={executeDelete} className="flex-1 py-2 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition-colors cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* DEPT STATS / DOSSIER MODAL */}
      {activeDeptStat && (
        <div 
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto" 
          onClick={() => setActiveDeptStat(null)}
        >
          <div 
            className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-3">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-black text-xl shadow-2xs">
                    {activeDeptStat.initials || 'DEP'}
                 </div>
                 <div>
                   <h3 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight leading-none mb-1 font-outfit">{activeDeptStat.name}</h3>
                   <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Operations Branch & Functional Scope
                   </div>
                 </div>
               </div>

               <button 
                 onClick={() => setActiveDeptStat(null)} 
                 className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
               >
                 <X className="w-5 h-5" />
               </button>
            </div>

            {/* Stats Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 overscroll-contain chat-custom-scrollbar">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                 
                 <div className="bg-slate-50 rounded-2xl p-4 shadow-2xs border border-slate-200 text-center">
                    <div className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mb-1">Members</div>
                    <div className="text-2xl font-black text-slate-900 leading-none">{getMembersForDept(activeDeptStat.name).length || activeDeptStat.members || 0}</div>
                 </div>

                 <div className="bg-slate-50 rounded-2xl p-4 shadow-2xs border border-slate-200 text-center">
                    <div className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mb-1">Status</div>
                    <div className="text-xs font-black text-emerald-700 leading-none mt-1 uppercase">Active</div>
                 </div>

                 <div className="bg-slate-50 rounded-2xl p-4 shadow-2xs border border-slate-200 text-center">
                    <div className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mb-1">Governance</div>
                    <div className="text-xs font-black text-indigo-700 leading-none mt-1">Managed</div>
                 </div>

                 <div className="bg-slate-50 rounded-2xl p-4 shadow-2xs border border-slate-200 text-center">
                    <div className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mb-1">Initials</div>
                    <div className="text-xl font-black text-slate-700 leading-none">{activeDeptStat.initials || 'DEP'}</div>
                 </div>

              </div>

              {/* Functional Scope Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" /> Operational Mandate & Responsibilities
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {activeDeptStat.description || activeDeptStat.desc || 'Core functional division managing professional workflows, quality deliverables, and client satisfaction.'}
                </p>
              </div>

              {/* Assigned Members List */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" /> Assigned Personnel ({getMembersForDept(activeDeptStat.name).length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {getMembersForDept(activeDeptStat.name).length > 0 ? (
                    getMembersForDept(activeDeptStat.name).map((m, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold shadow-2xs">
                        👤 {m.name} <span className="text-[10px] text-emerald-700 font-normal">({m.role || 'Staff'})</span>
                      </span>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 italic">No dedicated staff assigned exclusively. Operates with general practice pool.</div>
                  )}
                </div>
              </div>

              {/* Manager Assignment UI */}
              {canManageDepts && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-2">
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
                      className="w-full bg-white px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 outline-none focus:border-indigo-600 shadow-2xs cursor-pointer text-slate-800"
                    >
                      <option value="">Leave Unassigned</option>
                      {availableManagers.map(m => (
                        <option key={m.id} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 font-medium">Managers have elevated permissions to dispatch bulk assignations to members within this department scope.</p>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 border-t border-slate-100 flex items-center gap-2.5 shrink-0">
               <button 
                 onClick={() => handlePrintSingleDept(activeDeptStat)}
                 className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-2xs hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
               >
                 <Printer className="w-3.5 h-3.5 text-slate-600" /> Print Dossier
               </button>
               <button 
                 onClick={() => handleDownloadSingleDept(activeDeptStat)}
                 className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-2xs hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
               >
                 <Download className="w-3.5 h-3.5" /> CSV
               </button>
               <button 
                 onClick={() => setActiveDeptStat(null)}
                 className="flex-1 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md hover:bg-emerald-700 transition-all cursor-pointer"
               >
                 Close Dossier
               </button>
              </div>
            </div>
          </div>
        )}

    </div>
  );
}
