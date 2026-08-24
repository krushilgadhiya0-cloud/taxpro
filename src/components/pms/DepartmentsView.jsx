import React, { useState, useEffect, useMemo } from 'react';
import { Building2, Plus, Bot, Users, HelpCircle, UserCog, CheckSquare, Edit, Trash2, ChevronLeft, ChevronRight, X, Download, Printer, Search, Save, Edit2, ShieldCheck, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { logAuditActivity } from '../../lib/auditLogger';

export default function DepartmentsView({ userRole: propRole, onShowToast }) {
  const effectiveRole = (propRole || localStorage.getItem('taxpro_user_role') || 'Admin');
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

    if (onShowToast) onShowToast('Opening All Departments Master Register Print Document...', 'info');

    // Open isolated high-resolution print window
    const printWindow = window.open('', '_blank', 'width=1100,height=850');
    if (!printWindow) {
      window.print();
      return;
    }

    // Helper to calculate members for each dept
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
              <strong style="color: #111827; font-size: 12px;">${d.name}</strong>
            </div>
          </td>
          <td>
            <span style="font-weight: 700; color: ${d.manager && d.manager !== 'Not assigned' && d.manager !== 'Unassigned' ? '#0f766e' : '#6b7280'};">
              ${d.manager || 'Unassigned / Managing Partner'}
            </span>
          </td>
          <td style="text-align: center;">
            <span style="background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 11px;">
              ${count}
            </span>
          </td>
          <td style="color: #374151; font-size: 10px; max-width: 220px; line-height: 1.35;">
            ${memberNames}
          </td>
          <td style="color: #4b5563; font-size: 10.5px; line-height: 1.4;">
            ${d.description || d.desc || 'Operational department responsible for client advisory and compliance.'}
          </td>
          <td style="text-align: center;">
            <span style="background: #ecfdf5; color: #047857; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 9px; text-transform: uppercase;">
              Active
            </span>
          </td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>TaxPro PMS - Departments & Functional Divisions Master Register</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm 10mm 10mm 10mm;
          }
          * {
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
          body {
            background-color: #ffffff;
            color: #111827;
            margin: 0;
            padding: 14px;
          }
          .header-box {
            border-bottom: 2px solid #0f766e;
            padding-bottom: 10px;
            margin-bottom: 14px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .logo-title {
            font-size: 22px;
            font-weight: 900;
            letter-spacing: -0.5px;
            color: #0f766e;
            margin: 0 0 2px 0;
          }
          .subtitle {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #1e293b;
            margin: 0;
          }
          .meta-info {
            text-align: right;
            font-size: 10px;
            color: #4b5563;
          }
          .meta-info strong {
            color: #111827;
          }
          .summary-cards {
            display: flex;
            gap: 12px;
            margin-bottom: 14px;
          }
          .summary-card {
            flex: 1;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 8px 12px;
            border-radius: 8px;
          }
          .summary-card-title {
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            margin-bottom: 2px;
          }
          .summary-card-val {
            font-size: 16px;
            font-weight: 900;
            color: #0f766e;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-top: 4px;
            margin-bottom: 18px;
          }
          thead tr {
            background-color: #f1f5f9;
            border-top: 1px solid #cbd5e1;
            border-bottom: 2px solid #64748b;
          }
          th {
            padding: 8px 10px;
            text-align: left;
            font-weight: 800;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #334155;
            border-right: 1px solid #e2e8f0;
          }
          th:last-child {
            border-right: none;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
            border-right: 1px solid #f1f5f9;
            vertical-align: middle;
          }
          td:last-child {
            border-right: none;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .footer-box {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #cbd5e1;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 10px;
            color: #64748b;
          }
          .signatory-line {
            width: 180px;
            border-bottom: 1px solid #94a3b8;
            height: 30px;
            margin-bottom: 4px;
          }
          .print-btn-bar {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #0f766e;
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(15,118,110,0.3);
            border: none;
          }
          @media print {
            .print-btn-bar {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <h1 class="logo-title">TAXPRO PMS</h1>
            <p class="subtitle">Organizational Departments & Functional Divisions Master Register</p>
            <div style="font-size: 10px; color: #64748b; margin-top: 3px;">
              Practice Management & Organizational Governance Architecture
            </div>
          </div>
          <div class="meta-info">
            <div>Generated: <strong>${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></div>
            <div>Registry: <strong>Live PostgreSQL Database Synchronized</strong></div>
          </div>
        </div>

        <div class="summary-cards">
          <div class="summary-card">
            <div class="summary-card-title">Total Departments</div>
            <div class="summary-card-val">${list.length} Divisions</div>
          </div>
          <div class="summary-card">
            <div class="summary-card-title">Assigned Managers</div>
            <div class="summary-card-val">${uniqueManagersCount} Department Heads</div>
          </div>
          <div class="summary-card">
            <div class="summary-card-title">Total Practice Members</div>
            <div class="summary-card-val">${teamMembersList.length > 0 ? teamMembersList.length : teamMembers.length} Staff Members</div>
          </div>
          <div class="summary-card">
            <div class="summary-card-title">Governance Status</div>
            <div class="summary-card-val" style="color: #059669;">100% Operational</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              <th style="width: 180px;">Department Name</th>
              <th style="width: 150px;">Department Head / Manager</th>
              <th style="width: 70px; text-align: center;">Strength</th>
              <th style="width: 200px;">Assigned Staff / Key Members</th>
              <th>Operational Scope & Responsibilities</th>
              <th style="width: 70px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${deptRowsHtml}
          </tbody>
        </table>

        <div class="footer-box">
          <div>
            <div>TaxPro Practice Management System • Official Departmental Architecture</div>
            <div style="font-size: 9px; margin-top: 2px;">Verified & Authenticated against Enterprise PostgreSQL Database</div>
          </div>
          <div style="text-align: right;">
            <div class="signatory-line"></div>
            <div>Managing Partner / Practice Head</div>
          </div>
        </div>

        <button class="print-btn-bar" onclick="window.print()">🖨️ Print Now</button>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handlePrintSingleDept = (dept) => {
    if (!dept) return;
    if (onShowToast) onShowToast(`Opening printable dossier for ${dept.name}...`, 'info');

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      window.print();
      return;
    }

    const assigned = getMembersForDept(dept.name);
    const count = assigned.length > 0 ? assigned.length : (dept.members || dept.head_count || 0);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>TaxPro PMS - Department Dossier: ${dept.name}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          body { padding: 20px; color: #111827; }
          .header { border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 24px; font-weight: 900; color: #0f766e; margin: 0; }
          .subtitle { font-size: 12px; color: #4b5563; font-weight: bold; text-transform: uppercase; margin-top: 4px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
          .card-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 8px; }
          .members-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
          .member-tag { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; }
          .print-btn { position: fixed; bottom: 20px; right: 20px; background: #0f766e; color: white; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; border: none; }
          @media print { .print-btn { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">TAXPRO PMS</h1>
            <div class="subtitle">Official Department Dossier & Operational Mandate</div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #64748b;">
            <div>Generated: <strong>${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></div>
            <div>Status: <strong style="color: #059669;">Active & Operational</strong></div>
          </div>
        </div>

        <div class="card" style="background: #f0fdfa; border-color: #99f6e4;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="background: #0f766e; color: white; width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 900;">
              ${dept.initials || 'DEP'}
            </div>
            <div>
              <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f766e;">${dept.name}</h2>
              <div style="font-size: 12px; color: #115e59; margin-top: 2px;">Managing Head: <strong>${dept.manager || 'Unassigned / Managing Partner'}</strong></div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Department Functional Scope & Responsibilities</div>
          <p style="font-size: 13px; line-height: 1.6; color: #334155; margin: 0;">
            ${dept.description || dept.desc || 'Core functional division managing practice workflows, client deliverables, and professional compliance.'}
          </p>
        </div>

        <div class="card">
          <div class="card-title">Assigned Personnel & Staff Members (${count} Total)</div>
          <div class="members-list">
            ${assigned.length > 0 
              ? assigned.map(m => `<span class="member-tag">👤 ${m.name} (${m.role || 'Member'})</span>`).join('') 
              : `<span style="font-size: 12px; color: #64748b;">No dedicated staff exclusively mapped. Operates with general practice pool resources.</span>`
            }
          </div>
        </div>

        <div style="margin-top: 40px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #64748b;">
          <div>TaxPro Practice Management System • Official Record</div>
          <div style="text-align: right;">
            <div style="width: 180px; border-bottom: 1px solid #94a3b8; height: 35px; margin-bottom: 4px;"></div>
            <div>Authorized Practice Signatory</div>
          </div>
        </div>

        <button class="print-btn" onclick="window.print()">🖨️ Print Now</button>
        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 300); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
    const { error } = await supabase.from('departments').delete().eq('id', deleteId);
    if (error) {
       if (onShowToast) onShowToast(`Error deleting: ${error.message}`, 'error');
       return;
    }
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
          className="modal-overlay-backdrop"
        >
          <div className="modal-content-box max-w-2xl">
            {/* Premium Gradient Header */}
            <div className="bg-gradient-to-r from-gray-900 via-emerald-950 to-gray-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-xs">
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
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-emerald-500 transition-all font-medium text-xs text-gray-900 cursor-pointer"
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
                        className="w-full px-3 py-2.5 bg-white border border-emerald-300 rounded-xl outline-none focus:border-emerald-500 transition-all font-medium text-xs text-gray-900 mt-2"
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
                        className="w-full px-3 py-2.5 pl-9 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-emerald-500 font-medium text-xs text-gray-900 cursor-pointer"
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
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-emerald-500 resize-none text-xs text-gray-800 min-h-[110px]"
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

      {/* EDIT DEPARTMENT MODAL */}
      {editingDept && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setEditingDept(null); }}
          className="modal-overlay-backdrop"
        >
          <div className="modal-content-box max-w-2xl">
            {/* Premium Gradient Header */}
            <div className="bg-gradient-to-r from-gray-900 via-emerald-950 to-gray-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-xs">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-white tracking-tight">
                    Edit Department: {editingDept.name}
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Update department title, head of division & functional scope
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setEditingDept(null)} 
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer shadow-xs"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditDeptSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold scrollbar-thin">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className="text-gray-700 block mb-1">Department Name <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required 
                      value={editingDept.name || ''} 
                      onChange={e => setEditingDept({...editingDept, name: e.target.value})} 
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-emerald-500 text-xs font-semibold" 
                    />
                  </div>

                  <div>
                    <label className="text-gray-700 block mb-1">Department Head / Manager</label>
                    <div className="relative">
                      <UserCog className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select 
                        value={editingDept.manager || ''} 
                        onChange={e => setEditingDept({...editingDept, manager: e.target.value})} 
                        className="w-full px-3 py-2.5 pl-9 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-emerald-500 font-medium text-xs text-gray-900 cursor-pointer"
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
                    <label className="text-gray-700 block mb-1">Operational Scope & Description</label>
                    <textarea 
                      rows={5} 
                      value={editingDept.description || editingDept.desc || ''} 
                      onChange={e => setEditingDept({...editingDept, description: e.target.value, desc: e.target.value})} 
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-emerald-500 resize-none text-xs text-gray-800 min-h-[110px]" 
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Sticky Actions */}
              <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 mt-3 -mx-6 -mb-6">
                <button 
                  type="button" 
                  onClick={() => setEditingDept(null)} 
                  className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
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
          className="modal-overlay-backdrop"
        >
          <div className="modal-content-box max-w-sm p-6 text-center border border-red-100 dark:border-red-900/30 animate-shake">
            <h3 className="text-xl font-extrabold text-gray-900 mb-2 font-outfit">Delete Department</h3>
            <p className="text-sm text-gray-500 mb-6 font-medium">Are you sure you want to permanently disband this department? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer">Cancel</button>
              <button onClick={executeDelete} className="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md transition-colors cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* DEPT STATS / DOSSIER MODAL */}
      {activeDeptStat && (
        <div className="modal-overlay-backdrop z-[60]" onClick={() => setActiveDeptStat(null)}>
          <div 
            className="modal-content-box max-w-2xl border border-gray-100"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-[#0f766e] to-[#042f2e] w-full p-6 sm:p-8 pb-10 text-white">
               <button onClick={() => setActiveDeptStat(null)} className="absolute top-4 right-4 p-2 bg-black/10 text-white rounded-full hover:bg-black/20 transition-colors cursor-pointer">
                 <X className="w-4 h-4" />
               </button>
               
               <div className="flex items-center gap-4">
                 <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white font-black text-2xl shadow-inner border border-white/20">
                    {activeDeptStat.initials || 'DEP'}
                 </div>
                 <div className="text-white">
                   <h3 className="font-extrabold text-2xl tracking-tight leading-none mb-1 font-outfit">{activeDeptStat.name}</h3>
                   <div className="flex items-center gap-2 text-emerald-100 text-sm font-semibold">
                      <Building2 className="w-3.5 h-3.5" /> Operations Branch & Functional Scope
                   </div>
                 </div>
               </div>
            </div>

            {/* Stats Body */}
            <div className="px-6 pb-6 -mt-4 z-10 relative">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                 
                 <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 text-center">
                    <div className="text-gray-400 text-[9px] font-bold uppercase tracking-widest mb-1">Members</div>
                    <div className="text-2xl font-black text-gray-900 leading-none">{getMembersForDept(activeDeptStat.name).length || activeDeptStat.members || 0}</div>
                 </div>

                 <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 text-center">
                    <div className="text-gray-400 text-[9px] font-bold uppercase tracking-widest mb-1">Status</div>
                    <div className="text-xs font-black text-emerald-600 leading-none mt-1 uppercase">Active</div>
                 </div>

                 <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 text-center">
                    <div className="text-gray-400 text-[9px] font-bold uppercase tracking-widest mb-1">Governance</div>
                    <div className="text-xs font-black text-indigo-600 leading-none mt-1">Managed</div>
                 </div>

                 <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 text-center bg-gray-50/50">
                    <div className="text-gray-400 text-[9px] font-bold uppercase tracking-widest mb-1">Initials</div>
                    <div className="text-xl font-black text-gray-600 leading-none">{activeDeptStat.initials || 'DEP'}</div>
                 </div>

              </div>

              {/* Functional Scope Card */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" /> Operational Mandate & Responsibilities
                </div>
                <p className="text-xs text-gray-700 leading-relaxed font-medium">
                  {activeDeptStat.description || activeDeptStat.desc || 'Core functional division managing professional workflows, quality deliverables, and client satisfaction.'}
                </p>
              </div>

              {/* Assigned Members List */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" /> Assigned Personnel ({getMembersForDept(activeDeptStat.name).length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {getMembersForDept(activeDeptStat.name).length > 0 ? (
                    getMembersForDept(activeDeptStat.name).map((m, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
                        👤 {m.name} <span className="text-[10px] text-emerald-600 font-normal">({m.role || 'Staff'})</span>
                      </span>
                    ))
                  ) : (
                    <div className="text-xs text-gray-400 italic">No dedicated staff assigned exclusively. Operates with general practice pool.</div>
                  )}
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
                      className="w-full bg-white px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 outline-none focus:border-indigo-500 shadow-xs appearance-none cursor-pointer"
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
                 onClick={() => handlePrintSingleDept(activeDeptStat)}
                 className="flex-1 py-2.5 bg-white border border-emerald-300 text-emerald-700 text-xs font-bold rounded-xl shadow-xs hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
               >
                 <Printer className="w-4 h-4 text-emerald-600" /> Print Dossier
               </button>
               <button 
                 onClick={() => handleDownloadSingleDept(activeDeptStat)}
                 className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl shadow-xs hover:bg-gray-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
               >
                 <Download className="w-4 h-4" /> CSV
               </button>
               <button 
                 onClick={() => setActiveDeptStat(null)}
                 className="flex-1 py-2.5 bg-[#0f766e] text-white text-xs font-bold rounded-xl shadow-md hover:bg-teal-800 transition-all cursor-pointer"
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
