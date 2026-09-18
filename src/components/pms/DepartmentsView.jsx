import React, { useState, useEffect, useMemo } from 'react';
import { Building2, Plus, Bot, Users, HelpCircle, UserCog, CheckSquare, Edit, Trash2, ChevronLeft, ChevronRight, X, Download, Printer, Search, Save, Edit2, ShieldCheck, FileText, UserPlus, ArrowRightLeft, Check, CheckCircle2, Filter, AlertCircle, RefreshCw, Mail, Phone, IndianRupee, Tag, CheckCheck, Sparkles, UserCheck } from 'lucide-react';
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
  const [newDeptForm, setNewDeptForm] = useState({ name: 'Compliance', customName: '', isOther: false, desc: '', manager: '', initialMemberIds: [] });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Member Bifurcation & Department Assignment State
  const [bifurcateModalDept, setBifurcateModalDept] = useState(null);
  const [bifurcateTab, setBifurcateTab] = useState('existing'); // 'existing' | 'new'
  const [bifurcateFilter, setBifurcateFilter] = useState('all'); // 'all' | 'in_dept' | 'other_dept' | 'unassigned'
  const [bifurcateSearch, setBifurcateSearch] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [isSavingBifurcate, setIsSavingBifurcate] = useState(false);
  const [quickNewMember, setQuickNewMember] = useState({ name: '', email: '', phone: '', role: 'Employee', salary: '₹50,000/mo' });
  
  const [depts, setDepts] = useState([]);
  const [teamMembersList, setTeamMembersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDepts();
  }, []);

  const sanitizeDeptList = (list, activeMembers = []) => {
    if (!Array.isArray(list)) return [];
    const validManagerNames = new Set([
      'Super Administrator',
      'Root Administrator',
      'Managing Partner',
      ...activeMembers.map(m => m && m.name).filter(Boolean)
    ]);
    return list.map(d => {
      if (!d) return d;
      let mgr = d.manager;
      if (mgr && (mgr.toLowerCase().includes('priya') || mgr.toLowerCase().includes('sharma') || mgr.toLowerCase().includes('patel'))) {
        mgr = 'Not assigned';
      } else if (mgr && mgr !== 'Not assigned' && mgr !== 'Unassigned' && activeMembers.length > 0 && !validManagerNames.has(mgr)) {
        mgr = 'Not assigned';
      }
      return { ...d, manager: mgr || 'Not assigned' };
    });
  };

  const fetchDepts = async () => {
    // Purge legacy dummy caches from browser
    try {
      ['taxpro_departments', 'taxpro_table_departments', 'taxpro_team_members', 'taxpro_table_team_members'].forEach(k => {
        const c = localStorage.getItem(k);
        if (c && (c.includes('Priya') || c.includes('Sharma') || c.includes('Finance Lead') || c.includes('EMP-102'))) {
          localStorage.removeItem(k);
        }
      });
    } catch(e) {}
    setIsLoading(true);
    try {
      const [deptRes, teamRes] = await Promise.all([
        supabase.from('departments').select('*').order('created_at', { ascending: false }),
        supabase.from('team_members').select('*').order('created_at', { ascending: false })
      ]);

      const members = Array.isArray(teamRes.data) ? teamRes.data.filter(m => !m.name?.includes('Priya') && !m.email?.includes('priya')) : [];
      setTeamMembersList(members);

      const rawDepts = deptRes.data;
      if (!deptRes.error && Array.isArray(rawDepts) && rawDepts.length > 0) {
        const cleaned = sanitizeDeptList(rawDepts, members);
        setDepts(cleaned);
        localStorage.setItem('taxpro_departments', JSON.stringify(cleaned));
      } else {
        const cached = localStorage.getItem('taxpro_departments');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setDepts(sanitizeDeptList(parsed, members));
          } catch(e) {
            setDepts([]);
          }
        } else if (Array.isArray(rawDepts)) {
          setDepts(sanitizeDeptList(rawDepts, members));
        }
      }
    } catch (e) {
      console.warn('[Departments Load Notice]:', e.message);
      const cached = localStorage.getItem('taxpro_departments');
      if (cached) {
        try {
          setDepts(sanitizeDeptList(JSON.parse(cached), []));
        } catch(err) {}
      }
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

    // If initial members were chosen, assign them directly
    if (newDeptForm.initialMemberIds && newDeptForm.initialMemberIds.length > 0) {
      try {
        await supabase
          .from('team_members')
          .update({ department: finalName })
          .in('id', newDeptForm.initialMemberIds);
        
        const updatedMembers = teamMembersList.map(m => 
          newDeptForm.initialMemberIds.includes(m.id) ? { ...m, department: finalName } : m
        );
        setTeamMembersList(updatedMembers);
        try {
          localStorage.setItem('taxpro_team_members', JSON.stringify(updatedMembers));
        } catch(e) {}
      } catch (err) {
        console.warn('Could not assign initial members:', err);
      }
    }

    setDepts(prev => [data[0], ...prev]);

    setIsAddModalOpen(false);
    setNewDeptForm({ name: 'Compliance', customName: '', isOther: false, desc: '', manager: '', initialMemberIds: [] });
    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

    logAuditActivity({
      action: 'ADD_DEPARTMENT',
      module: 'Departments',
      details: `Created new Department "${finalName}" with Manager "${newDeptForm.manager || 'Unassigned'}" and ${newDeptForm.initialMemberIds?.length || 0} assigned members`,
      metadata: { name: finalName, manager: newDeptForm.manager, memberCount: newDeptForm.initialMemberIds?.length || 0 }
    });

    if (onShowToast) onShowToast(`Department ${finalName} created successfully!`, 'success');
  };

  // 1-Click Member Assignment / Transfer Handler
  const handleAssignMemberToDept = async (memberId, deptName) => {
    try {
      setIsSavingBifurcate(true);
      const member = teamMembersList.find(m => m.id === memberId);
      const memberName = member?.name || 'Staff Member';

      const { error } = await supabase
        .from('team_members')
        .update({ department: deptName })
        .eq('id', memberId);

      if (error) throw error;

      const updatedList = teamMembersList.map(m => m.id === memberId ? { ...m, department: deptName } : m);
      setTeamMembersList(updatedList);

      try {
        localStorage.setItem('taxpro_team_members', JSON.stringify(updatedList));
      } catch (e) {}

      logAuditActivity({
        action: 'BIFURCATE_MEMBER_DEPARTMENT',
        module: 'Departments',
        details: `Assigned member "${memberName}" to Department "${deptName}"`,
        metadata: { memberId, memberName, department: deptName }
      });

      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
      if (onShowToast) onShowToast(`✓ ${memberName} successfully assigned to ${deptName}!`, 'success');
    } catch (err) {
      console.error('[Assign Member Error]:', err);
      if (onShowToast) onShowToast(`Failed to assign member: ${err.message}`, 'error');
    } finally {
      setIsSavingBifurcate(false);
    }
  };

  // 1-Click Unassign Member from Department (Moves to General pool)
  const handleUnassignMemberFromDept = async (member, deptName) => {
    try {
      setIsSavingBifurcate(true);
      const newDept = 'General';

      const { error } = await supabase
        .from('team_members')
        .update({ department: newDept })
        .eq('id', member.id);

      if (error) throw error;

      const updatedList = teamMembersList.map(m => m.id === member.id ? { ...m, department: newDept } : m);
      setTeamMembersList(updatedList);

      try {
        localStorage.setItem('taxpro_team_members', JSON.stringify(updatedList));
      } catch (e) {}

      logAuditActivity({
        action: 'UNASSIGN_MEMBER_DEPARTMENT',
        module: 'Departments',
        details: `Removed "${member.name}" from Department "${deptName}" (moved to General pool)`,
        metadata: { memberId: member.id, memberName: member.name, fromDept: deptName }
      });

      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
      if (onShowToast) onShowToast(`${member.name} removed from ${deptName} (moved to General pool)`, 'info');
    } catch (err) {
      console.error('[Unassign Member Error]:', err);
      if (onShowToast) onShowToast(`Failed to unassign: ${err.message}`, 'error');
    } finally {
      setIsSavingBifurcate(false);
    }
  };

  // Bulk Bifurcation Handler
  const handleBulkAssignMembers = async (targetDeptName) => {
    if (!selectedMemberIds.length || !targetDeptName) return;
    try {
      setIsSavingBifurcate(true);

      const { error } = await supabase
        .from('team_members')
        .update({ department: targetDeptName })
        .in('id', selectedMemberIds);

      if (error) throw error;

      const updatedList = teamMembersList.map(m => 
        selectedMemberIds.includes(m.id) ? { ...m, department: targetDeptName } : m
      );
      setTeamMembersList(updatedList);

      try {
        localStorage.setItem('taxpro_team_members', JSON.stringify(updatedList));
      } catch (e) {}

      logAuditActivity({
        action: 'BULK_BIFURCATE_MEMBERS',
        module: 'Departments',
        details: `Bifurcated ${selectedMemberIds.length} members into Department "${targetDeptName}"`,
        metadata: { memberIds: selectedMemberIds, department: targetDeptName }
      });

      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
      if (onShowToast) onShowToast(`✓ ${selectedMemberIds.length} members successfully bifurcated into ${targetDeptName}!`, 'success');
      setSelectedMemberIds([]);
    } catch (err) {
      console.error('[Bulk Assign Error]:', err);
      if (onShowToast) onShowToast(`Bulk assign failed: ${err.message}`, 'error');
    } finally {
      setIsSavingBifurcate(false);
    }
  };

  // Quick Register New Staff Member Directly into Target Department
  const handleQuickRegisterMemberInDept = async (e, targetDeptName) => {
    e.preventDefault();
    if (!quickNewMember.name || !quickNewMember.email) {
      if (onShowToast) onShowToast('Please enter Name and Email', 'warning');
      return;
    }
    const cleanName = quickNewMember.name.trim();
    const cleanEmail = quickNewMember.email.trim().toLowerCase();

    try {
      setIsSavingBifurcate(true);
      const empId = `EMP-${Date.now().toString().slice(-6)}`;
      const presetPass = 'TaxPro@2026';

      const newMemberPayload = {
        id: empId,
        name: cleanName,
        email: cleanEmail,
        phone: quickNewMember.phone ? quickNewMember.phone.trim() : null,
        role: quickNewMember.role || 'Employee',
        department: targetDeptName,
        status: 'Active',
        preset_password: presetPass,
        salary: quickNewMember.salary || '₹50,000/mo',
        date_of_joining: new Date().toISOString().slice(0, 10),
        attendance: '100%',
        tasks_completed: 0,
        online: true
      };

      const { data, error } = await supabase
        .from('team_members')
        .upsert([newMemberPayload], { onConflict: 'email' })
        .select();

      if (error) throw error;

      try {
        await supabase.from('users').upsert([{
          id: `USR-${Date.now().toString().slice(-6)}`,
          email: cleanEmail,
          password: presetPass,
          name: cleanName,
          role: quickNewMember.role || 'Employee',
          department: targetDeptName,
          phone: quickNewMember.phone ? quickNewMember.phone.trim() : null,
          status: 'Active'
        }], { onConflict: 'email' });
      } catch (uErr) {}

      const added = (data && data[0]) ? data[0] : newMemberPayload;
      const updatedList = [added, ...teamMembersList];
      setTeamMembersList(updatedList);

      try {
        localStorage.setItem('taxpro_team_members', JSON.stringify(updatedList));
      } catch (e) {}

      logAuditActivity({
        action: 'REGISTER_DEPARTMENT_MEMBER',
        module: 'Departments',
        details: `Registered new member "${cleanName}" directly into Department "${targetDeptName}"`,
        metadata: { name: cleanName, email: cleanEmail, department: targetDeptName }
      });

      setQuickNewMember({ name: '', email: '', phone: '', role: 'Employee', salary: '₹50,000/mo' });
      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
      if (onShowToast) onShowToast(`✓ ${cleanName} added and assigned to ${targetDeptName}! Default password: ${presetPass}`, 'success');
      setBifurcateTab('existing');
    } catch (err) {
      console.error('[Quick Register Member Error]:', err);
      if (onShowToast) onShowToast(`Registration error: ${err.message}`, 'error');
    } finally {
      setIsSavingBifurcate(false);
    }
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
                        <div 
                          onClick={(e) => {
                            if (canManageDepts) {
                              e.stopPropagation();
                              setBifurcateModalDept(d);
                              setBifurcateTab('existing');
                              setSelectedMemberIds([]);
                            }
                          }}
                          className={`flex items-center gap-1.5 text-gray-500 mt-1 ${canManageDepts ? 'hover:text-emerald-700 cursor-pointer pointer-events-auto' : ''}`}
                          title={canManageDepts ? "Click to manage & bifurcate members" : `${memberCount} members`}
                        >
                          <Users className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-xs font-semibold">{memberCount} Member{memberCount === 1 ? '' : 's'}</span>
                          {canManageDepts && (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              + Assign
                            </span>
                          )}
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

                  <p className="text-xs text-gray-500 mb-3 flex-1 pr-4 leading-relaxed line-clamp-2">
                    {d.description || d.desc || 'Core functional division managing practice workflows and compliance deliverables.'}
                  </p>

                  {/* Assigned Staff Preview Pills */}
                  {assigned.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-3 flex-wrap pointer-events-auto">
                      {assigned.slice(0, 3).map((m) => (
                        <span 
                          key={m.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold"
                        >
                          <span className="w-3.5 h-3.5 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center text-[8px] font-black">
                            {m.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="truncate max-w-[90px]">{m.name.split(' ')[0]}</span>
                        </span>
                      ))}
                      {assigned.length > 3 && (
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">
                          +{assigned.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

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
                   <div className="flex items-center gap-3 text-xs font-bold">
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

                   {canManageDepts && (
                     <button
                       type="button"
                       onClick={(e) => {
                         e.stopPropagation();
                         setBifurcateModalDept(d);
                         setBifurcateTab('existing');
                         setSelectedMemberIds([]);
                       }}
                       className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                       title={`Add & bifurcate members into ${d.name}`}
                     >
                       <UserPlus className="w-3.5 h-3.5" />
                       <span>+ Add Members</span>
                     </button>
                   )}
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

              {/* Assign Initial Members (Optional) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                    Bifurcate Initial Members (Optional)
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {newDeptForm.initialMemberIds?.length || 0} selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {teamMembersList.length > 0 ? (
                    teamMembersList.map(m => {
                      const isChecked = (newDeptForm.initialMemberIds || []).includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            const current = newDeptForm.initialMemberIds || [];
                            if (current.includes(m.id)) {
                              setNewDeptForm({ ...newDeptForm, initialMemberIds: current.filter(id => id !== m.id) });
                            } else {
                              setNewDeptForm({ ...newDeptForm, initialMemberIds: [...current, m.id] });
                            }
                          }}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isChecked
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black ${
                            isChecked ? 'bg-white text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {isChecked ? '✓' : m.name.charAt(0).toUpperCase()}
                          </span>
                          <span>{m.name}</span>
                          <span className={`text-[9px] font-normal ${isChecked ? 'text-emerald-100' : 'text-slate-400'}`}>
                            ({m.department || 'General'})
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">No members currently in practice roster.</div>
                  )}
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
                <div className="flex items-center justify-between mb-2.5">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" /> Assigned Personnel ({getMembersForDept(activeDeptStat.name).length})
                  </div>
                  {canManageDepts && (
                    <button
                      type="button"
                      onClick={() => {
                        setBifurcateModalDept(activeDeptStat);
                        setBifurcateTab('existing');
                        setSelectedMemberIds([]);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0f766e] hover:bg-teal-800 text-white text-[11px] font-bold shadow-xs cursor-pointer transition-all hover:scale-105 active:scale-95"
                    >
                      <UserPlus className="w-3 h-3" /> + Add / Bifurcate Members
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {getMembersForDept(activeDeptStat.name).length > 0 ? (
                    getMembersForDept(activeDeptStat.name).map((m, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold shadow-2xs group/member">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-black shrink-0">
                          {m.name.charAt(0).toUpperCase()}
                        </span>
                        <span>{m.name}</span>
                        <span className="text-[10px] text-emerald-700 font-normal">({m.role || 'Staff'})</span>
                        {canManageDepts && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnassignMemberFromDept(m, activeDeptStat.name);
                            }}
                            title={`Remove ${m.name} from ${activeDeptStat.name} (move to General)`}
                            className="w-4 h-4 rounded-full hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))
                  ) : (
                    <div className="flex items-center justify-between w-full py-2">
                      <div className="text-xs text-slate-400 italic">No dedicated staff assigned exclusively. Operates with general practice pool.</div>
                      {canManageDepts && (
                        <button
                          type="button"
                          onClick={() => {
                            setBifurcateModalDept(activeDeptStat);
                            setBifurcateTab('existing');
                            setSelectedMemberIds([]);
                          }}
                          className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                        >
                          + Assign Staff Now
                        </button>
                      )}
                    </div>
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

      {/* BIFURCATE & ADD MEMBERS TO DEPARTMENT MODAL */}
      {bifurcateModalDept && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setBifurcateModalDept(null); }}
          className="fixed inset-0 z-[999999] bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div 
            className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-lg shadow-md shadow-emerald-500/20">
                  {bifurcateModalDept.initials || 'DEP'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black font-outfit text-slate-900 tracking-tight">
                      Bifurcate & Add Members
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                      {bifurcateModalDept.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Assign, transfer, or register practice staff into this departmental division
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setBifurcateModalDept(null)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setBifurcateTab('existing')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  bifurcateTab === 'existing'
                    ? 'bg-white text-emerald-800 shadow-xs border border-slate-200 ring-2 ring-emerald-500/10'
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bifurcate Existing Staff</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  bifurcateTab === 'existing' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  {teamMembersList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setBifurcateTab('new')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  bifurcateTab === 'new'
                    ? 'bg-white text-emerald-800 shadow-xs border border-slate-200 ring-2 ring-emerald-500/10'
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                <span>+ Register New Staff to {bifurcateModalDept.name}</span>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 overscroll-contain chat-custom-scrollbar">
              {bifurcateTab === 'existing' ? (
                <>
                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:max-w-xs">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search staff by name, role, email..."
                        value={bifurcateSearch}
                        onChange={(e) => setBifurcateSearch(e.target.value)}
                        className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-emerald-500 font-medium"
                      />
                      {bifurcateSearch && (
                        <button
                          type="button"
                          onClick={() => setBifurcateSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                      {[
                        { id: 'all', label: 'All Staff', count: teamMembersList.length },
                        { 
                          id: 'in_dept', 
                          label: `In ${bifurcateModalDept.name}`, 
                          count: teamMembersList.filter(m => (m.department || '').toLowerCase() === bifurcateModalDept.name.toLowerCase()).length 
                        },
                        { 
                          id: 'other_dept', 
                          label: 'Other Depts', 
                          count: teamMembersList.filter(m => m.department && m.department.toLowerCase() !== bifurcateModalDept.name.toLowerCase() && m.department.toLowerCase() !== 'general').length 
                        },
                        { 
                          id: 'unassigned', 
                          label: 'General / Unassigned', 
                          count: teamMembersList.filter(m => !m.department || m.department.toLowerCase() === 'general' || m.department.toLowerCase() === 'unassigned').length 
                        }
                      ].map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setBifurcateFilter(f.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                            bifurcateFilter === f.id
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {f.label} ({f.count})
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bulk Action Bar (Visible when members are checked) */}
                  {selectedMemberIds.length > 0 && (
                    <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between shadow-xs animate-fade-in">
                      <div className="flex items-center gap-2 text-xs font-black text-emerald-900">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{selectedMemberIds.length} staff member{selectedMemberIds.length > 1 ? 's' : ''} selected</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedMemberIds([])}
                          className="px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          disabled={isSavingBifurcate}
                          onClick={() => handleBulkAssignMembers(bifurcateModalDept.name)}
                          className="px-4 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Bifurcate & Assign to {bifurcateModalDept.name}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Staff List */}
                  <div className="space-y-2">
                    {(() => {
                      const filtered = teamMembersList.filter(m => {
                        if (bifurcateSearch) {
                          const q = bifurcateSearch.toLowerCase();
                          const matchName = (m.name || '').toLowerCase().includes(q);
                          const matchEmail = (m.email || '').toLowerCase().includes(q);
                          const matchRole = (m.role || '').toLowerCase().includes(q);
                          const matchDept = (m.department || '').toLowerCase().includes(q);
                          if (!matchName && !matchEmail && !matchRole && !matchDept) return false;
                        }
                        const isCurrentDept = (m.department || '').toLowerCase() === bifurcateModalDept.name.toLowerCase();
                        const isGeneral = !m.department || m.department.toLowerCase() === 'general' || m.department.toLowerCase() === 'unassigned';
                        if (bifurcateFilter === 'in_dept') return isCurrentDept;
                        if (bifurcateFilter === 'other_dept') return !isCurrentDept && !isGeneral;
                        if (bifurcateFilter === 'unassigned') return isGeneral;
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="py-12 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            No team members found matching current filter or search.
                          </div>
                        );
                      }

                      return filtered.map(m => {
                        const isInThisDept = (m.department || '').toLowerCase() === bifurcateModalDept.name.toLowerCase();
                        const isSelected = selectedMemberIds.includes(m.id);

                        return (
                          <div
                            key={m.id}
                            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                              isInThisDept
                                ? 'bg-emerald-50/40 border-emerald-200'
                                : isSelected
                                ? 'bg-indigo-50/40 border-indigo-300'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedMemberIds(prev => [...prev, m.id]);
                                  } else {
                                    setSelectedMemberIds(prev => prev.filter(id => id !== m.id));
                                  }
                                }}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                              />

                              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-xs text-slate-700 shrink-0">
                                {m.name ? m.name.charAt(0).toUpperCase() : 'U'}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-xs text-slate-900 truncate">{m.name}</span>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                    {m.role || 'Staff'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 truncate flex items-center gap-2 mt-0.5">
                                  <span className="truncate">{m.email || 'No email'}</span>
                                  <span>•</span>
                                  <span className={`font-bold ${
                                    isInThisDept 
                                      ? 'text-emerald-700' 
                                      : m.department && m.department.toLowerCase() !== 'general' 
                                      ? 'text-indigo-700' 
                                      : 'text-slate-500'
                                  }`}>
                                    Current: {m.department || 'General Pool'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isInThisDept ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-black text-[11px] border border-emerald-300 flex items-center gap-1">
                                    <Check className="w-3 h-3" /> In Department
                                  </span>
                                  <button
                                    type="button"
                                    disabled={isSavingBifurcate}
                                    onClick={() => handleUnassignMemberFromDept(m, bifurcateModalDept.name)}
                                    className="px-2.5 py-1 rounded-xl bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-[11px] font-bold transition-all cursor-pointer"
                                    title="Unassign & move to General pool"
                                  >
                                    Unassign
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isSavingBifurcate}
                                  onClick={() => handleAssignMemberToDept(m.id, bifurcateModalDept.name)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs transition-all cursor-pointer hover:scale-105 active:scale-95"
                                >
                                  <UserPlus className="w-3 h-3" />
                                  <span>{m.department && m.department.toLowerCase() !== 'general' ? 'Transfer Here' : '+ Assign'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </>
              ) : (
                /* Tab 2: Quick Register New Member directly to this department */
                <form onSubmit={(e) => handleQuickRegisterMemberInDept(e, bifurcateModalDept.name)} className="space-y-4">
                  <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                      🏢
                    </div>
                    <div>
                      <div className="text-xs font-black text-emerald-900">
                        Direct Department Assignment: {bifurcateModalDept.name}
                      </div>
                      <div className="text-[11px] text-emerald-700 font-medium">
                        This staff member will be registered in TaxPro and automatically mapped to the {bifurcateModalDept.name} division.
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-700 font-bold block mb-1 text-xs">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Rahul Mehta"
                        value={quickNewMember.name}
                        onChange={(e) => setQuickNewMember({ ...quickNewMember, name: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-emerald-600 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-slate-700 font-bold block mb-1 text-xs">
                        Work Email <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="email"
                        placeholder="e.g. rahul@taxpro.com"
                        value={quickNewMember.email}
                        onChange={(e) => setQuickNewMember({ ...quickNewMember, email: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-emerald-600 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-slate-700 font-bold block mb-1 text-xs">
                        Mobile Phone (Optional)
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={quickNewMember.phone}
                        onChange={(e) => setQuickNewMember({ ...quickNewMember, phone: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-emerald-600 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-slate-700 font-bold block mb-1 text-xs">
                        Designated Role
                      </label>
                      <select
                        value={quickNewMember.role}
                        onChange={(e) => setQuickNewMember({ ...quickNewMember, role: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-emerald-600 font-semibold cursor-pointer"
                      >
                        <option value="Employee">Employee / Staff</option>
                        <option value="Associate">Associate</option>
                        <option value="Senior Associate">Senior Associate</option>
                        <option value="Manager">Department Manager</option>
                        <option value="Article Assistant">Article Assistant</option>
                        <option value="Consultant">Consultant</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-700 font-bold block mb-1 text-xs">
                        Monthly Salary
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ₹50,000/mo"
                        value={quickNewMember.salary}
                        onChange={(e) => setQuickNewMember({ ...quickNewMember, salary: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-emerald-600 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-slate-700 font-bold block mb-1 text-xs">
                        Target Department
                      </label>
                      <div className="px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-emerald-800 flex items-center justify-between">
                        <span>{bifurcateModalDept.name}</span>
                        <span className="text-[10px] font-bold text-slate-400">Auto-Assigned</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingBifurcate}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{isSavingBifurcate ? 'Registering...' : `Register & Assign to ${bifurcateModalDept.name}`}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-md px-6 py-3.5 border-t border-slate-100 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500 font-semibold">
                Currently assigned: <b className="text-emerald-700 font-black">{getMembersForDept(bifurcateModalDept.name).length}</b> staff member{getMembersForDept(bifurcateModalDept.name).length === 1 ? '' : 's'}
              </div>
              <button
                type="button"
                onClick={() => setBifurcateModalDept(null)}
                className="px-5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
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
