import React, { useState, useEffect } from 'react';
import { 
  User, 
  Users2, 
  RotateCcw, 
  Upload, 
  Send, 
  Plus, 
  Trash2, 
  X, 
  Shield, 
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Mail, 
  Phone, 
  Building, 
  Briefcase, 
  KeyRound, 
  Download, 
  AlertCircle, 
  Loader2, 
  Printer, 
  Archive,
  CheckSquare,
  Lock,
  Unlock,
  SlidersHorizontal,
  Check,
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  Activity,
  Receipt,
  DollarSign,
  MessageSquare,
  FileText,
  Lightbulb,
  Zap,
  Settings,
  CalendarCheck,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const ALL_MODULES = [
  { id: 'dashboard', name: 'Dashboard Analytics', icon: LayoutDashboard, category: 'Management' },
  { id: 'clients', name: 'Clients Directory & KYC', icon: Users2, category: 'Operations' },
  { id: 'projects', name: 'Projects & Milestones', icon: FolderKanban, category: 'Operations' },
  { id: 'tasks', name: 'Tasks Management', icon: CheckSquare, category: 'Operations' },
  { id: 'todos', name: 'To Do Checklists', icon: ListTodo, category: 'Operations' },
  { id: 'workload', name: 'Workload & Time Tracking', icon: Activity, category: 'Operations' },
  { id: 'team_members', name: 'Team Members Directory', icon: User, category: 'Management' },
  { id: 'departments', name: 'Departments Structure', icon: Building, category: 'Management' },
  { id: 'receipts_payments', name: 'Receipts & Payments Ledger', icon: Receipt, category: 'Financials' },
  { id: 'members_payment', name: 'Staff Payroll Processing', icon: DollarSign, category: 'Financials' },
  { id: 'fees_tracking', name: 'Client Fees & Invoicing', icon: DollarSign, category: 'Financials' },
  { id: 'communication', name: 'Firm Broadcast & Notices', icon: MessageSquare, category: 'Communication' },
  { id: 'private_chat', name: 'Private Direct Chat', icon: MessageSquare, category: 'Communication' },
  { id: 'reports', name: 'Compliance & Audit Reports', icon: FileText, category: 'Compliance' },
  { id: 'ideas', name: 'Idea Innovation Box', icon: Lightbulb, category: 'Operations' },
  { id: 'attendance', name: 'Biometric Attendance Check-in', icon: CalendarCheck, category: 'Operations' },
  { id: 'integrations', name: 'Integrations (SMTP / WhatsApp)', icon: Zap, category: 'Management' },
  { id: 'settings', name: 'Firm Settings & Preferences', icon: Settings, category: 'Management' }
];

export default function TeamMembersView({ userRole = 'Admin', onShowToast }) {
  const [activeTab, setActiveTab] = useState('Members');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [activeMemberStat, setActiveMemberStat] = useState(null);
  const [accessModalMember, setAccessModalMember] = useState(null);
  const [accessForm, setAccessForm] = useState({
    role: 'Employee',
    status: 'Active',
    permissions: {}
  });

  const [deleteData, setDeleteData] = useState(null); // { id: 1, type: 'Members' }
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingAccess, setIsSavingAccess] = useState(false);
  
  // Advanced State Formulation
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMembers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('team_members').select('*').order('created_at', { ascending: false });
    if (!error && data) {
       setMembers(data);
    }
    
    const { data: taskData } = await supabase.from('global_tasks').select('*');
    if (taskData) {
       setTasks(taskData);
    }
    
    const { data: deptData } = await supabase.from('departments').select('name');
    if (deptData) {
       setDepartmentsList(deptData.map(d => d.name));
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMembers();
    
    const handleAITx = () => {
       fetchMembers();
       if (onShowToast) onShowToast('Team Directory instantly synced with cloud database.', 'info');
    };
    const handleAiDownload = () => {
       const btn = document.getElementById('ai-trigger-csv');
       if (btn) btn.click();
    };
    const handleInnerNav = (e) => {
       if (e.detail) setActiveTab(e.detail);
    };
    
    window.addEventListener('ai_member_added', handleAITx);
    window.addEventListener('taxpro_db_updated', handleAITx);
    window.addEventListener('ai_download', handleAiDownload);
    window.addEventListener('ai_inner_tab', handleInnerNav);
    
    return () => {
      window.removeEventListener('ai_member_added', handleAITx);
      window.removeEventListener('taxpro_db_updated', handleAITx);
      window.removeEventListener('ai_download', handleAiDownload);
      window.removeEventListener('ai_inner_tab', handleInnerNav);
    };
  }, []);

  // Form states for invitation
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Employee',
    department: 'General',
    password: ''
  });

  const [isInviting, setIsInviting] = useState(false);

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.name) {
      if (onShowToast) onShowToast('Email and Name are required.', 'error');
      return;
    }

    const purePhone = formData.phone.replace(/[^0-9]/g, '');
    if (formData.phone && purePhone.length !== 10) {
      if (onShowToast) onShowToast('Phone number must be exactly 10 digits!', 'error');
      return;
    }
    
    if (formData.password && formData.password.length < 6) {
      if (onShowToast) onShowToast('Preset Password must be strictly at least 6 characters.', 'warning');
      return;
    }
    
    setIsInviting(true);
    
    try {
      // Initialize default permissions based on role
      const initialPerms = {};
      ALL_MODULES.forEach(m => {
        if (formData.role === 'Administrator') {
          initialPerms[m.id] = true;
        } else if (formData.role === 'Manager') {
          initialPerms[m.id] = !['integrations'].includes(m.id);
        } else {
          initialPerms[m.id] = !['integrations', 'members_payment', 'receipts_payments'].includes(m.id);
        }
      });

      const { data: dbData, error: dbError } = await supabase.from('team_members').insert([
        {
          name: formData.name,
          email: formData.email.toLowerCase().trim(),
          phone: formData.phone ? purePhone : '',
          role: formData.role,
          department: formData.department,
          status: 'Pending Invite',
          preset_password: formData.password || 'password123',
          permissions: initialPerms
        }
      ]).select();
      
      if (dbError) throw new Error(`Database Error: ${dbError.message}`);
      
      if (dbData && dbData.length > 0) {
         setMembers(prev => [dbData[0], ...prev]);
         window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
      }

      // Try email dispatch
      try {
        const smtpRaw = localStorage.getItem('taxpro_smtp');
        const smtpConfig = smtpRaw ? JSON.parse(smtpRaw) : null;
        const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        
        await fetch(`${baseUrl}/api/invite`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
              smtpConfig,
              memberName: formData.name,
              targetEmail: formData.email,
              generatedPassword: formData.password || 'password123',
              role: formData.role,
              origin: window.location.origin
           })
        });
      } catch (backendErr) {}
      
      if (onShowToast) onShowToast(`✓ User ${formData.name} successfully registered to database!`, 'success');

    } catch (err) {
      if (onShowToast) onShowToast(`Registration Failed: ${err.message}`, 'error');
    } finally {
      setIsInviting(false);
      setIsInviteModalOpen(false);
    }
    
    setFormData({ name: '', email: '', phone: '', role: 'Employee', department: 'General', password: '' });
    setActiveTab('Invitations');
  };

  // One-Click Grant / Revoke Access
  const handleToggleQuickAccess = async (e, member) => {
    e.stopPropagation();
    const isCurrentlyActive = member.status === 'Active';
    const nextStatus = isCurrentlyActive ? 'Access Revoked' : 'Active';

    try {
      const { error } = await supabase.from('team_members').update({
        status: nextStatus
      }).eq('id', member.id);

      if (error) throw error;

      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, status: nextStatus } : m));
      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

      if (isCurrentlyActive) {
        if (onShowToast) onShowToast(`🔒 Access REVOKED for ${member.name}. Account is now suspended.`, 'warning');
      } else {
        if (onShowToast) onShowToast(`✓ Access RESTORED for ${member.name}. Full permissions re-activated.`, 'success');
      }
    } catch (err) {
      if (onShowToast) onShowToast(`Failed to update access: ${err.message}`, 'error');
    }
  };

  // Open Detailed Permissions & Access Control Modal
  const handleOpenAccessModal = (e, member) => {
    e.stopPropagation();
    setAccessModalMember(member);
    
    let currentPerms = member.permissions || {};
    if (typeof currentPerms === 'string') {
      try { currentPerms = JSON.parse(currentPerms); } catch (e) { currentPerms = {}; }
    }

    // Populate defaults if empty
    if (Object.keys(currentPerms).length === 0) {
      ALL_MODULES.forEach(m => {
        if (member.role === 'Administrator') {
          currentPerms[m.id] = true;
        } else if (member.role === 'Manager') {
          currentPerms[m.id] = !['integrations'].includes(m.id);
        } else {
          currentPerms[m.id] = !['integrations', 'members_payment', 'receipts_payments'].includes(m.id);
        }
      });
    }

    setAccessForm({
      role: member.role || 'Employee',
      status: member.status || 'Active',
      permissions: currentPerms
    });
  };

  // Save Permissions Matrix to PostgreSQL
  const handleSaveAccessPermissions = async () => {
    if (!accessModalMember) return;
    setIsSavingAccess(true);

    try {
      const { error } = await supabase.from('team_members').update({
        role: accessForm.role,
        status: accessForm.status,
        permissions: accessForm.permissions
      }).eq('id', accessModalMember.id);

      if (error) throw error;

      setMembers(prev => prev.map(m => m.id === accessModalMember.id ? {
        ...m,
        role: accessForm.role,
        status: accessForm.status,
        permissions: accessForm.permissions
      } : m));

      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

      if (onShowToast) onShowToast(`✓ Access permissions saved for ${accessModalMember.name}!`, 'success');
      setAccessModalMember(null);
    } catch (err) {
      if (onShowToast) onShowToast(`Failed to save permissions: ${err.message}`, 'error');
    } finally {
      setIsSavingAccess(false);
    }
  };

  // Permission Presets
  const applyPreset = (type) => {
    const updated = {};
    if (type === 'all') {
      ALL_MODULES.forEach(m => { updated[m.id] = true; });
      setAccessForm(prev => ({ ...prev, status: 'Active', permissions: updated }));
    } else if (type === 'revoke') {
      ALL_MODULES.forEach(m => { updated[m.id] = false; });
      setAccessForm(prev => ({ ...prev, status: 'Access Revoked', permissions: updated }));
    } else if (type === 'manager') {
      ALL_MODULES.forEach(m => { updated[m.id] = !['integrations'].includes(m.id); });
      setAccessForm(prev => ({ ...prev, role: 'Manager', status: 'Active', permissions: updated }));
    } else if (type === 'employee') {
      ALL_MODULES.forEach(m => { updated[m.id] = !['integrations', 'members_payment', 'receipts_payments', 'departments'].includes(m.id); });
      setAccessForm(prev => ({ ...prev, role: 'Employee', status: 'Active', permissions: updated }));
    }
  };

  const toggleSinglePermission = (moduleId) => {
    setAccessForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleId]: !prev.permissions[moduleId]
      }
    }));
  };

  const executeDelete = async () => {
    if (!deleteData) return;
    
    const { error } = await supabase.from('team_members').delete().eq('id', deleteData.id);
    if (error) {
       if (onShowToast) onShowToast(`Failed to delete: ${error.message}`, 'error');
       return;
    }
    
    setMembers(prev => prev.filter(x => x.id !== deleteData.id));
    setDeleteData(null);
    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
    if (onShowToast) onShowToast('Record successfully removed.', 'info');
  };

  const activeMembers = members.filter(m => m.status === 'Active' || m.status === 'Access Revoked');
  const pendingMembers = members.filter(m => m.status === 'Pending Invite');
  const pastMembers = members.filter(m => m.status === 'Old' || m.status === 'Past');
  
  const currentList = activeTab === 'Members' ? activeMembers : activeTab === 'Invitations' ? pendingMembers : activeTab === 'Past' ? pastMembers : [];

  const handleArchive = async (e, obj) => {
     e.stopPropagation();
     if (!window.confirm(`Are you sure you want to mark ${obj.name} as a Past Employee?\n\nTheir access will be revoked but all their historical data, tasks, and payments will remain safely archived.`)) return;
     
     const { error } = await supabase.from('team_members').update({ status: 'Past' }).eq('id', obj.id);
     if (error) {
        if (onShowToast) onShowToast(`Failed to archive: ${error.message}`, 'error');
        return;
     }

     setMembers(prev => prev.map(m => m.id === obj.id ? { ...m, status: 'Past' } : m));
     window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
     if (onShowToast) onShowToast(`${obj.name} successfully moved to Past Employees.`, 'info');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchMembers();
    setIsRefreshing(false);
    if (onShowToast) onShowToast('List data refreshed!', 'success');
  };

  const handleDownloadCSV = () => {
    if (currentList.length === 0) {
      if (onShowToast) onShowToast('No data available to download.', 'error');
      return;
    }
    
    const headers = ['Name', 'Email', 'Role', 'Department', 'Status'];
    const csvRows = [headers.join(',')];
    
    currentList.forEach(obj => {
      const row = [
        `"${obj.name}"`,
        `"${obj.email}"`,
        `"${obj.role || ''}"`,
        `"${obj.department || ''}"`,
        `"${obj.status || ''}"`
      ];
      csvRows.push(row.join(','));
    });
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTab.toLowerCase()}_list.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    if (onShowToast) onShowToast(`${activeTab} list downloaded securely.`, 'success');
  };

  const triggerPrint = () => {
    if (onShowToast) onShowToast('Preparing printable Team hierarchy view...', 'info');
    setTimeout(() => window.print(), 500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in">
      
      {/* Top Header Summary Card */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        
        {/* Left Title Area */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100 shadow-xs">
              <Users2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight font-outfit">Team Directory & Access Control</h2>
              <p className="text-xs text-gray-500 font-medium">Manage workforce accounts, roles, and granular system access permissions</p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 flex-wrap mt-1">
            <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 flex flex-col justify-center min-w-[120px] shadow-sm">
              <div className="text-xl font-black text-gray-900 leading-none">{members.length}</div>
              <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mt-1.5">TOTAL WORKFORCE</div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 flex flex-col justify-center min-w-[120px] shadow-sm">
              <div className="text-xl font-black text-emerald-600 leading-none">
                {members.filter(m => m.status === 'Active').length}
              </div>
              <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mt-1.5">ACTIVE ACCESS</div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 flex flex-col justify-center min-w-[120px] shadow-sm">
              <div className="text-xl font-black text-red-600 leading-none">
                {members.filter(m => m.status === 'Access Revoked').length}
              </div>
              <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mt-1.5">ACCESS REVOKED</div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 flex flex-col justify-center min-w-[120px] shadow-sm">
              <div className="text-xl font-black text-purple-600 leading-none">
                {members.filter(m => m.role && m.role.toLowerCase().includes('manager')).length}
              </div>
              <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mt-1.5">MANAGERS</div>
            </div>
          </div>
        </div>

        {/* Right Actions & Tabs area */}
        <div className="flex flex-col items-end gap-4 w-full xl:w-auto print:hidden">
          <div className="flex flex-wrap items-center gap-2.5 w-full xl:justify-end">
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-200 bg-white text-emerald-700 font-bold text-xs transition-colors ${isRefreshing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-50'}`}
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button 
              onClick={triggerPrint}
              className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button 
              onClick={handleDownloadCSV}
              className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            {userRole === 'Admin' && (
              <button 
                onClick={() => setIsInviteModalOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#0f766e] hover:bg-teal-800 text-white font-bold text-xs shadow-md transition-all"
              >
                <Send className="w-3.5 h-3.5" /> Invite Member
              </button>
            )}
          </div>

          {/* Sub-Tabs */}
          <div className="flex flex-wrap items-center bg-gray-100 p-1.5 rounded-2xl border border-gray-200 w-full sm:w-auto">
             <button 
               onClick={() => setActiveTab('Members')}
               className={`flex items-center justify-center min-w-[110px] gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                 activeTab === 'Members' ? 'bg-white text-emerald-700 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
               }`}
             >
               <User className="w-3.5 h-3.5" /> Members <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'Members' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200'}`}>{activeMembers.length}</span>
             </button>
             <button 
               onClick={() => setActiveTab('Invitations')}
               className={`flex items-center justify-center min-w-[110px] gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                 activeTab === 'Invitations' ? 'bg-white text-emerald-700 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
               }`}
             >
               <Send className="w-3.5 h-3.5" /> Invitations <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'Invitations' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200'}`}>{pendingMembers.length}</span>
             </button>
             <button 
               onClick={() => setActiveTab('Past')}
               className={`flex items-center justify-center min-w-[110px] gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                 activeTab === 'Past' ? 'bg-white text-orange-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
               }`}
             >
               <Archive className="w-3.5 h-3.5" /> Past <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'Past' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200'}`}>{pastMembers.length}</span>
             </button>
          </div>
        </div>

      </div>

      {/* Main Content Board */}
      {currentList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 sm:py-32 opacity-70 bg-white rounded-2xl border border-gray-200">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-gray-300" strokeWidth={3} />
          </div>
          <h3 className="text-lg font-bold font-outfit text-gray-700 mb-1">No {activeTab.toLowerCase()} found</h3>
          <p className="text-xs text-gray-400">Invite new team members or update permissions to populate this list</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {currentList.map(obj => {
            const isRevoked = obj.status === 'Access Revoked';
            const isActive = obj.status === 'Active';

            return (
              <div 
                key={obj.id}
                onClick={() => {
                   if (activeTab === 'Members') setActiveMemberStat(obj);
                }}
                className={`border rounded-2xl p-5 bg-white shadow-sm flex flex-col justify-between hover:shadow-lg transition-all relative ${
                  isRevoked ? 'border-red-200 bg-red-50/10' : 'border-gray-200'
                } ${activeTab === 'Members' ? 'cursor-pointer hover:border-emerald-300 hover:-translate-y-1' : ''}`}
              >
                {/* Member Header */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-bold border text-sm uppercase ${
                        isRevoked ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                        {obj.name ? obj.name.charAt(0).toUpperCase() : obj.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="text-sm font-extrabold text-gray-900 truncate tracking-tight flex items-center gap-1.5">
                          <span>{obj.name}</span>
                          {isRevoked && (
                            <span className="w-2 h-2 rounded-full bg-red-500" title="Access Revoked" />
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate mt-0.5 flex items-center gap-1">
                          <Briefcase className="w-3 h-3 flex-shrink-0 text-gray-400" />
                          <span>{obj.role || 'Employee'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Contact Info */}
                  <div className="pt-2.5 border-t border-gray-100 flex flex-col gap-1.5 text-xs text-gray-600 font-medium">
                     <div className="flex items-center gap-2 truncate">
                       <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                       <span className="truncate">{obj.email}</span>
                     </div>
                     {obj.phone && (
                       <div className="flex items-center gap-2 truncate">
                         <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                         <span>{obj.phone}</span>
                       </div>
                     )}
                     {obj.department && (
                       <div className="flex items-center gap-2 truncate">
                         <Building className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                         <span className="truncate">Dept: {obj.department}</span>
                       </div>
                     )}
                  </div>
                </div>

                {/* Bottom Access Status & Admin Actions */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col gap-2.5">
                  
                  {/* Status Badge */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 ${
                      isRevoked
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : (obj.status.includes('Pending') ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700')
                    }`}>
                      {isRevoked ? <Lock className="w-3 h-3 text-red-600" /> : <ShieldCheck className="w-3 h-3" />}
                      {obj.status}
                    </span>

                    {/* Archive & Delete Icons */}
                    {userRole === 'Admin' && (
                      <div className="flex items-center gap-1">
                        {activeTab !== 'Past' && (
                          <button 
                            onClick={(e) => handleArchive(e, obj)}
                            className="p-1.5 text-gray-400 hover:bg-orange-50 hover:text-orange-500 rounded-lg transition-colors z-10"
                            title="Archive to Past Employees"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteData({ id: obj.id, type: activeTab });
                          }}
                          className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors z-10"
                          title="Permanently Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ADMIN ACCESS CONTROL BUTTONS */}
                  {userRole === 'Admin' && activeTab === 'Members' && (
                    <div className="grid grid-cols-2 gap-2 mt-1 z-10" onClick={(e) => e.stopPropagation()}>
                      
                      {/* Detailed Permissions Modal Button */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenAccessModal(e, obj)}
                        className="py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-xl border border-indigo-200 flex items-center justify-center gap-1 transition-all"
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>Permissions</span>
                      </button>

                      {/* Quick Revoke / Grant Access Toggle */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleQuickAccess(e, obj)}
                        className={`py-1.5 px-2 text-[11px] font-bold rounded-xl border flex items-center justify-center gap-1 transition-all ${
                          isRevoked
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                            : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-300'
                        }`}
                      >
                        {isRevoked ? (
                          <>
                            <Unlock className="w-3 h-3" />
                            <span>Grant Access</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3" />
                            <span>Revoke Access</span>
                          </>
                        )}
                      </button>

                    </div>
                  )}

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================================== */}
      {/* ACCESS CONTROL & PERMISSIONS MANAGEMENT MODAL */}
      {/* ======================================================================== */}
      {accessModalMember && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setAccessModalMember(null); }}
          className="modal-overlay-backdrop"
        >
          <div className="modal-content-box max-w-2xl">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-gray-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 font-bold text-lg">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black font-outfit tracking-tight">Access & Permissions Manager</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 font-mono font-bold">
                      Live Database
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Managing access rights for <span className="font-bold text-white">{accessModalMember.name}</span> ({accessModalMember.email})
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setAccessModalMember(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-6">
              
              {/* Designated System Role */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Designated System Role</label>
                <select
                  value={accessForm.role}
                  onChange={(e) => setAccessForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full bg-white border border-gray-300 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500"
                >
                  <option value="Administrator">Administrator (Executive Suite)</option>
                  <option value="Manager">Department Manager (Supervision)</option>
                  <option value="Employee">Employee (Staff & Operations)</option>
                </select>
              </div>

              {/* Granular Module Matrix */}
              <div>
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-3">
                  Granular Module Permissions
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ALL_MODULES.map(m => {
                    const Icon = m.icon;
                    const isGranted = accessForm.permissions[m.id] !== false;

                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleSinglePermission(m.id)}
                        className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                          isGranted 
                            ? 'bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50' 
                            : 'bg-gray-50 border-gray-200 opacity-60 hover:opacity-90'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isGranted ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-gray-900 truncate">{m.name}</div>
                            <div className="text-[10px] text-gray-400 uppercase font-semibold">{m.category}</div>
                          </div>
                        </div>

                        {/* Toggle Pill */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                          isGranted ? 'bg-emerald-600 text-white' : 'bg-gray-300 text-gray-600'
                        }`}>
                          {isGranted ? <Check className="w-3.5 h-3.5" /> : <X className="w-3 h-3" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setAccessModalMember(null)}
                className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveAccessPermissions}
                disabled={isSavingAccess}
                className="px-6 py-2.5 bg-[#0f766e] hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-lg shadow-teal-700/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSavingAccess ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Save Access Rights</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 
        ========================================================================
        NEW INVITE MEMBER MODAL FORM
        ========================================================================
      */}
      {isInviteModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsInviteModalOpen(false); }}
          className="modal-overlay-backdrop"
        >
          <div className="modal-content-box max-w-3xl">
            {/* Premium Gradient Header */}
            <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-xs">
                  <Users2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-white tracking-tight">
                    Invite Team Member
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Register a new employee, set role designation & initialize credentials
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsInviteModalOpen(false)} 
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer shadow-xs"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold scrollbar-thin">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Column 1: Personal & Contact */}
                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className="text-gray-700 block mb-1">Full Name <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        placeholder="e.g. Rahul Sharma"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium text-gray-800 outline-none focus:bg-white focus:border-indigo-500 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-700 block mb-1">Official Email Address <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="email" 
                        placeholder="e.g. rahul@firm.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium text-gray-800 outline-none focus:bg-white focus:border-indigo-500 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-700 block mb-1">Phone Number (10 Digits)</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="tel" 
                        placeholder="e.g. 9876543210"
                        maxLength={10}
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/[^0-9]/g, '')})}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium text-gray-800 outline-none focus:bg-white focus:border-indigo-500 transition-colors font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Column 2: Role, Department & Credentials */}
                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className="text-gray-700 block mb-1">Role / Designation</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-medium text-gray-800 outline-none focus:bg-white focus:border-indigo-500 transition-colors cursor-pointer"
                    >
                      <option value="Employee">Employee (Associate)</option>
                      <option value="Manager">Department Manager</option>
                      <option value="Administrator">Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-700 block mb-1">Department</label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-medium text-gray-800 outline-none focus:bg-white focus:border-indigo-500 transition-colors cursor-pointer"
                    >
                      <option value="General">General</option>
                      {departmentsList.map(d => (
                         <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-700 block mb-1">Preset Temporary Password</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        placeholder="e.g. TaxPro@2026"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium text-gray-800 outline-none focus:bg-white focus:border-indigo-500 transition-colors font-mono"
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 block">Leave blank to auto-generate a secure token.</span>
                  </div>
                </div>

              </div>

              {/* Bottom Sticky Actions */}
              <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 mt-3 -mx-6 -mb-6">
                <button 
                  type="button" 
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isInviting}
                  className="px-6 py-2.5 bg-[#0f766e] hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-700/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Register & Dispatch Invite</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteData && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteData(null); }}
          className="modal-overlay-backdrop"
        >
          <div className="modal-content-box max-w-sm p-6 text-center">
             <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                <Trash2 className="w-6 h-6" />
             </div>
             <h3 className="text-lg font-bold text-gray-900 mb-1">Confirm Permanent Deletion</h3>
             <p className="text-xs text-gray-500 mb-6">Are you sure you want to permanently delete this member record?</p>
             <div className="flex items-center justify-center gap-3">
               <button onClick={() => setDeleteData(null)} className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer">Cancel</button>
               <button onClick={executeDelete} className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md cursor-pointer">Confirm Delete</button>
             </div>
          </div>
        </div>
      )}

      {/* Quick Overview Modal */}
      {activeMemberStat && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setActiveMemberStat(null); }}
          className="modal-overlay-backdrop"
        >
          <div className="modal-content-box max-w-lg">
            <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-extrabold text-lg uppercase border border-white/30">
                  {activeMemberStat.name ? activeMemberStat.name.charAt(0) : 'U'}
                </div>
                <div>
                  <h3 className="text-lg font-bold font-outfit">{activeMemberStat.name}</h3>
                  <span className="text-xs text-emerald-100">{activeMemberStat.role} • {activeMemberStat.department || 'General'}</span>
                </div>
              </div>
              <button onClick={() => setActiveMemberStat(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 text-xs text-gray-700">
               <div className="flex justify-between py-2 border-b border-gray-100">
                 <span className="text-gray-400 font-bold">EMAIL:</span>
                 <span className="font-bold text-gray-800">{activeMemberStat.email}</span>
               </div>
               <div className="flex justify-between py-2 border-b border-gray-100">
                 <span className="text-gray-400 font-bold">STATUS:</span>
                 <span className="font-bold text-emerald-600">{activeMemberStat.status}</span>
               </div>
               <div className="flex justify-between py-2 border-b border-gray-100">
                 <span className="text-gray-400 font-bold">TASKS ASSIGNED:</span>
                 <span className="font-bold">{tasks.filter(t => t.assignee === activeMemberStat.name).length}</span>
               </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 text-center">
               <button 
                 onClick={() => setActiveMemberStat(null)}
                 className="px-6 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl w-full"
               >
                 Close
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
