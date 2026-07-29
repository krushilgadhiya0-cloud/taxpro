import React, { useState, useEffect } from 'react';
import { User, Users2, RotateCcw, Upload, Send, Plus, Trash2, X, Shield, Mail, Phone, Building, Briefcase, KeyRound, Download, AlertCircle, Loader2, Printer, Archive } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function TeamMembersView({ userRole, onShowToast }) {
  const [activeTab, setActiveTab] = useState('Members');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [activeMemberStat, setActiveMemberStat] = useState(null);
  const [deleteData, setDeleteData] = useState(null); // { id: 1, type: 'Members' }
  const [isRefreshing, setIsRefreshing] = useState(false);
  
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
       if (onShowToast) onShowToast('Team Directory instantly synced with Voice Engine.', 'info');
    };
    const handleAiDownload = () => {
       const btn = document.getElementById('ai-trigger-csv');
       if (btn) btn.click();
    };
    const handleInnerNav = (e) => {
       if (e.detail) setActiveTab(e.detail);
    };
    
    window.addEventListener('ai_member_added', handleAITx);
    window.addEventListener('taxpro_db_updated', handleAITx); // Also catch generic updates
    window.addEventListener('ai_download', handleAiDownload);
    window.addEventListener('ai_inner_tab', handleInnerNav);
    
    return () => {
      window.removeEventListener('ai_member_added', handleAITx);
      window.removeEventListener('taxpro_db_updated', handleAITx);
      window.removeEventListener('ai_download', handleAiDownload);
      window.removeEventListener('ai_inner_tab', handleInnerNav);
    };
  }, []);

  // Form states
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
    
    // Close and reset
    setIsInviting(true);
    let emailSent = false;
    
    try {
      // 1. Automatically register the user into the Cloud database "team_members" table FIRST
      const { data: dbData, error: dbError } = await supabase.from('team_members').insert([
        {
          name: formData.name,
          email: formData.email.toLowerCase().trim(),
          phone: formData.phone ? purePhone : '',
          role: formData.role,
          department: formData.department,
          status: 'Pending Invite',
          preset_password: formData.password || null
        }
      ]).select();
      
      if (dbError) throw new Error(`Database Error: ${dbError.message}`);
      
      if (dbData && dbData.length > 0) {
         setMembers(prev => [dbData[0], ...prev]);
         window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
      }

      // 2. Attempt to dispatch the invitation email via backend (Non-Critical)
      try {
        const smtpRaw = localStorage.getItem('taxpro_smtp');
        const smtpConfig = smtpRaw ? JSON.parse(smtpRaw) : null;
        const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        
        const response = await fetch(`${baseUrl}/api/invite`, {
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
        
        const data = await response.json();
        if (!data.success) {
           console.warn("SMTP Dispatch failed:", data.error);
        } else {
           if (onShowToast) onShowToast(`Real invitation efficiently delivered to ${formData.email}! User Registered.`, 'success');
        }
      } catch (backendErr) {
        console.warn("Backend unavailable for email dispatch. Skipping email.");
      }
      
      if (onShowToast) onShowToast(`User ${formData.name} Registered successfully to Cloud Directory.`, 'success');

    } catch (err) {
      if (onShowToast) onShowToast(`Registration Failed: ${err.message}`, 'error');
    } finally {
      setIsInviting(false);
      setIsInviteModalOpen(false);
    }
    
    setFormData({ name: '', email: '', phone: '', role: 'Employee', department: 'General', password: '' });
    setActiveTab('Invitations');
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

  const activeMembers = members.filter(m => m.status === 'Active');
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
    if (onShowToast) onShowToast('List data refreshed successfully!', 'success');
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

  // Used strictly as a target for Voice AI dispatch execution without closure issues
  useEffect(() => {
    const handleInvisibleClick = () => handleDownloadCSV();
    const btn = document.getElementById('ai-trigger-csv');
    if (btn) btn.addEventListener('click', handleInvisibleClick);
    return () => { if (btn) btn.removeEventListener('click', handleInvisibleClick); }
  }, [currentList, activeTab, onShowToast]);

  const triggerPrint = () => {
    if (onShowToast) onShowToast('Preparing printable Team hierarchy view...', 'info');
    setTimeout(() => window.print(), 500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50/50 min-h-screen text-gray-800 relative pb-24 border-t border-gray-100">
      
      {/* Invisible anchor for Voice Download Trigger */}
      <button id="ai-trigger-csv" className="hidden"></button>
      
      {/* Header section */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 mb-8">
        
        {/* Left Stats area */}
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-2xl w-12 h-12 flex items-center justify-center">
              <User className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 font-outfit leading-none mb-1">Members</h1>
              <p className="text-sm text-gray-500">Manage your team members and roles</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 sm:ml-8 mt-4 sm:mt-0">
            <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 flex flex-col justify-center min-w-[140px] shadow-sm">
              <div className="text-xl font-black text-gray-900 leading-none">{members.length}</div>
              <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mt-2">TOTAL MEMBERS</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 flex flex-col justify-center min-w-[140px] shadow-sm">
              <div className="text-xl font-black text-gray-900 leading-none">
                {members.filter(m => m.role && m.role.toLowerCase().includes('manager')).length}
              </div>
              <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mt-2">MANAGERS</div>
            </div>
          </div>
        </div>

        {/* Right Actions & Tabs area */}
        <div className="flex flex-col items-end gap-5 w-full xl:w-auto print:hidden">
          <div className="flex flex-wrap items-center gap-3 w-full xl:justify-end">
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 bg-white text-emerald-700 font-bold text-sm transition-colors flex-1 xl:flex-none ${isRefreshing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-50'}`}
            >
              <RotateCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button 
              onClick={triggerPrint}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-sm transition-colors flex-1 xl:flex-none"
            >
              <Printer className="w-4 h-4" /> Print List
            </button>
            <button 
              onClick={handleDownloadCSV}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-sm transition-colors flex-1 xl:flex-none"
            >
              <Download className="w-4 h-4" /> Download List
            </button>
            {userRole === 'Admin' && (
              <button 
                onClick={() => setIsInviteModalOpen(true)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0f766e] hover:bg-teal-800 text-white font-bold text-sm shadow-md transition-all w-full sm:w-auto"
              >
                <Send className="w-4 h-4" /> Invite Member
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center bg-gray-100 p-1.5 rounded-2xl border border-gray-200 w-full sm:w-auto overflow-x-auto">
             <button 
               onClick={() => setActiveTab('Members')}
               className={`flex items-center justify-center min-w-[120px] gap-2 px-4 sm:px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                 activeTab === 'Members' ? 'bg-white text-emerald-700 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
               }`}
             >
               <User className="w-4 h-4" /> Members <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'Members' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200'}`}>{activeMembers.length}</span>
             </button>
             <button 
               onClick={() => setActiveTab('Invitations')}
               className={`flex items-center justify-center min-w-[130px] gap-2 px-4 sm:px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                 activeTab === 'Invitations' ? 'bg-white text-emerald-700 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
               }`}
             >
               <Send className="w-4 h-4" /> Invitations <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'Invitations' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200'}`}>{pendingMembers.length}</span>
             </button>
             <button 
               onClick={() => setActiveTab('Past')}
               className={`flex items-center justify-center min-w-[120px] gap-2 px-4 sm:px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                 activeTab === 'Past' ? 'bg-white text-orange-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
               }`}
             >
               <Archive className="w-4 h-4" /> Past <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'Past' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200'}`}>{pastMembers.length}</span>
             </button>
          </div>
        </div>

      </div>

      {/* Main Content Board */}
      {currentList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 sm:py-32 opacity-70">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <User className="w-8 h-8 text-gray-300" strokeWidth={3} />
          </div>
          <h3 className="text-xl font-bold font-outfit text-gray-700 mb-2">No {activeTab.toLowerCase()} found</h3>
          <p className="text-sm text-gray-400">Invite team members to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {currentList.map(obj => (
            <div 
              key={obj.id}
              onClick={() => {
                 if(activeTab === 'Members') setActiveMemberStat(obj)
              }}
              className={`border border-gray-200 rounded-2xl p-5 bg-white shadow-sm flex flex-col justify-between hover:shadow-lg transition-all relative ${activeTab === 'Members' ? 'cursor-pointer hover:border-emerald-300 hover:-translate-y-1' : ''}`}
            >
              <div className="flex items-start gap-4 mb-3 pointer-events-none">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 text-emerald-600 font-bold border border-emerald-100">
                  {obj.name ? obj.name.charAt(0).toUpperCase() : obj.email.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="text-sm font-extrabold text-gray-900 truncate tracking-tight">{obj.name}</div>
                  <div className="text-xs text-gray-500 truncate mt-0.5 flex items-center gap-1">
                    <Briefcase className="w-3 h-3 flex-shrink-0" /> {obj.role}
                  </div>
                </div>
              </div>
              
              <div className="pt-3 border-t border-gray-50 flex flex-col gap-1.5 text-xs text-gray-600 font-medium">
                 <div className="flex items-center gap-2 truncate">
                   <Mail className="w-3.5 h-3.5 text-gray-400" /> {obj.email}
                 </div>
                 {obj.phone && (
                   <div className="flex items-center gap-2 truncate">
                     <Phone className="w-3.5 h-3.5 text-gray-400" /> {obj.phone}
                   </div>
                 )}
                 {obj.department && (
                   <div className="flex items-center gap-2 truncate">
                     <Building className="w-3.5 h-3.5 text-gray-400" /> Dept: {obj.department}
                   </div>
                 )}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 ${
                  obj.status.includes('Pending') ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {obj.preset_password && <KeyRound className="w-3 h-3" title="Has secure generated credentials" />}
                  {obj.status}
                </span>

                 {userRole === 'Admin' && (
                   <div className="flex items-center gap-1">
                     {activeTab !== 'Past' && (
                       <button 
                         onClick={(e) => handleArchive(e, obj)}
                         className="p-1.5 text-gray-400 hover:bg-orange-50 hover:text-orange-500 rounded-lg transition-colors z-10 relative"
                         title="Archive to Past Employees"
                       >
                         <Archive className="w-4 h-4" />
                       </button>
                     )}
                     <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteData({ id: obj.id, type: activeTab });
                      }}
                      className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors z-10 relative"
                      title="Permanently Delete"
                     >
                      <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                 )}
              </div>

            </div>
          ))}
        </div>
      )}
      
      {/* Persistent FAB */}
      {userRole === 'Admin' && (
        <button 
          onClick={() => setIsInviteModalOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-[#0f766e] text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl hover:scale-105 transition-all print:hidden"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* 
        ========================================================================
        NEW INVITE MEMBER MODAL FORM
        ========================================================================
      */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-lg">Invite Team Member</h3>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Configure Profile & Access</p>
                </div>
              </div>
              <button 
                onClick={() => setIsInviteModalOpen(false)}
                className="p-2 bg-gray-50 text-gray-500 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="invite-form" onSubmit={handleInviteSubmit} className="flex flex-col gap-5">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Full Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. John Doe" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm font-semibold border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Role / Designation</label>
                    <select 
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value})}
                      className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm font-semibold border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option>Employee</option>
                      <option>Tax Associate</option>
                      <option>Manager</option>
                      <option>Administrator</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Email Address *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="email" 
                        required
                        placeholder="john@example.com" 
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-gray-50 rounded-xl pl-9 pr-3 py-2.5 text-sm font-semibold border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Phone Number (10 Digits)</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="tel" 
                        maxLength="10"
                        placeholder="9999900000" 
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value.replace(/[^0-9]/g, '')})}
                        className="w-full bg-gray-50 rounded-xl pl-9 pr-3 py-2.5 text-sm font-semibold border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Department</label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select 
                      value={formData.department}
                      onChange={e => setFormData({...formData, department: e.target.value})}
                      className="w-full bg-gray-50 rounded-xl pl-9 pr-3 py-2.5 text-sm font-semibold border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {departmentsList.length > 0 ? (
                        departmentsList.map(dept => <option key={dept}>{dept}</option>)
                      ) : (
                        <>
                          <option>General</option>
                          <option>Sales and Marketing</option>
                          <option>Administration</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="pt-5 border-t border-gray-100 mt-2">
                  <div className="flex items-center gap-2 mb-3 text-emerald-700">
                    <Shield className="w-4 h-4" />
                    <h4 className="text-sm font-bold">Credential Generation</h4>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Optional: Automatically generate an initial password so this member can directly join without verifying their email first.</p>
                  
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Preset Password</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        placeholder="Leave blank fully secure invite link..." 
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        className="w-full bg-gray-50 rounded-xl pl-9 pr-3 py-2.5 text-sm font-semibold border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                </div>

              </form>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 sticky bottom-0 text-right">
              <button 
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-xl transition-colors mr-3"
              >
                Cancel
              </button>
              <button 
                form="invite-form"
                type="submit"
                disabled={isInviting}
                className={`px-6 py-2.5 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${isInviting ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-black hover:shadow-xl'}`}
              >
                {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isInviting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center border border-red-100 animate-shake">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900 mb-2">Remove Record</h3>
            <p className="text-sm text-gray-500 mb-6 font-medium">Are you sure you want to permanently delete this {deleteData.type.toLowerCase().slice(0, -1)}? This action cannot be revoked.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteData(null)} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={executeDelete} className="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* MEMBER STATS MODAL */}
      {activeMemberStat && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setActiveMemberStat(null)}>
          <div 
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 flex flex-col transform transition-all scale-100 opacity-100 max-h-[90vh] overflow-y-auto custom-scrollbar-hide"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-emerald-500 to-teal-700 w-full pt-8 pb-12 px-6">
               <button onClick={() => setActiveMemberStat(null)} className="absolute top-4 right-4 p-2 bg-black/10 text-white rounded-full hover:bg-black/20 transition-colors">
                 <X className="w-4 h-4" />
               </button>
               
               <div className="flex items-center gap-4">
                 <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-teal-700 font-black text-2xl shadow-lg border-2 border-emerald-100">
                    {activeMemberStat.name ? activeMemberStat.name.charAt(0).toUpperCase() : 'M'}
                 </div>
                 <div className="text-white">
                   <h3 className="font-extrabold text-2xl tracking-tight leading-none mb-1">{activeMemberStat.name}</h3>
                   <div className="flex items-center gap-2 text-emerald-100 text-sm font-semibold">
                      <Briefcase className="w-3.5 h-3.5" /> {activeMemberStat.role}
                   </div>
                 </div>
               </div>
            </div>

            {/* Stats Body */}
            <div className="px-6 pb-6 -mt-6">
              
              {(() => {
                 const memberTasks = tasks.filter(t => t.assignee === activeMemberStat.name);
                 const completed = memberTasks.filter(t => t.status === 'Completed').length;
                 const pending = memberTasks.filter(t => t.status === 'Pending').length;
                 const todays = memberTasks.filter(t => t.due_date === new Date().toISOString().split('T')[0]).length;
                 const total = memberTasks.length;

                 return (
                  <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                    <div className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 flex items-center justify-between">
                        <div>
                          <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Today's Tasks</div>
                          <div className="text-2xl font-black text-gray-900 leading-none">{todays}</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-blue-500" />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 flex items-center justify-between">
                        <div>
                          <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Tasks</div>
                          <div className="text-2xl font-black text-gray-900 leading-none">{total}</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-purple-500" />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 flex items-center justify-between">
                        <div>
                          <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Pending</div>
                          <div className="text-2xl font-black text-amber-500 leading-none">{pending}</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-amber-500" />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 flex items-center justify-between">
                        <div>
                          <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Completed</div>
                          <div className="text-2xl font-black text-emerald-500 leading-none">{completed}</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-emerald-500" />
                        </div>
                    </div>
                  </div>
                 );
              })()}

              {/* Task Mini-List */}
              <div>
                <h4 className="text-xs font-bold text-gray-800 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" /> Recent Active Assignments
                </h4>
                <div className="flex flex-col gap-2">
                   {tasks.filter(t => t.assignee === activeMemberStat.name).length > 0 ? (
                      tasks.filter(t => t.assignee === activeMemberStat.name).slice(0, 3).map(task => (
                        <div key={task.id} className="flex justify-between items-center p-3 rounded-lg border border-gray-100 bg-gray-50">
                          <span className="text-sm font-bold text-gray-800">{task.title}</span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${task.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{task.status}</span>
                        </div>
                      ))
                   ) : (
                     <div className="text-[10px] text-gray-400 font-bold bg-gray-50 border border-gray-100 p-4 rounded-xl text-center italic">
                       No active task assignments for this member yet.
                     </div>
                   )}
                </div>
              </div>

              {/* Security & Access Controls */}
              {userRole === 'Admin' && (
                <div className="mt-6 border-t border-gray-100 pt-5">
                  <h4 className="text-xs font-bold text-gray-800 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-600" /> Security & Access Controls
                  </h4>
                  <div className="flex flex-col gap-3">
                     <div>
                       <label className="text-[10px] font-bold text-gray-400 uppercase">Login ID (Email)</label>
                       <div className="relative mt-1">
                         <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                         <input 
                           type="text" 
                           value={activeMemberStat.email || ''}
                           onChange={(e) => setActiveMemberStat({...activeMemberStat, email: e.target.value})}
                           className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:bg-white focus:border-indigo-300 transition-colors"
                         />
                       </div>
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-gray-400 uppercase">Phone Number</label>
                       <div className="relative mt-1">
                         <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                         <input 
                           type="tel"
                           maxLength="10"
                           value={activeMemberStat.phone || ''}
                           onChange={(e) => setActiveMemberStat({...activeMemberStat, phone: e.target.value.replace(/[^0-9]/g, '')})}
                           className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:bg-white focus:border-indigo-300 transition-colors"
                         />
                       </div>
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-gray-400 uppercase">Current Password</label>
                       <div className="relative mt-1 flex gap-2">
                         <div className="relative flex-1">
                           <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                           <input 
                             type={activeMemberStat.preset_password ? "text" : "password"}
                             value={activeMemberStat.preset_password || ''}
                             placeholder={activeMemberStat.preset_password ? '********' : 'User secured password privately'}
                             className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:bg-white focus:border-indigo-300 transition-colors"
                             disabled
                           />
                         </div>
                         <button 
                           onClick={async () => {
                             if (activeTab === 'Members') {
                               setMembers(prev => prev.map(m => m.id === activeMemberStat.id ? activeMemberStat : m));
                             } else {
                               setInvitations(prev => prev.map(m => m.id === activeMemberStat.id ? activeMemberStat : m));
                             }
  
                             // Update Postgres DB
                             const { error } = await supabase.from('team_members').update({
                               email: activeMemberStat.email,
                               phone: activeMemberStat.phone
                             }).eq('id', activeMemberStat.id);
                             
                             if (error) {
                               if (onShowToast) onShowToast(`Failed to update details: ${error.message}`, 'error');
                               return;
                             }
  
                             if (onShowToast) onShowToast(`Details successfully updated for ${activeMemberStat.name}!`, 'success');
                           }}
                           className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors border border-indigo-100 whitespace-nowrap shadow-sm"
                         >
                           Update
                         </button>
                      </div>
                    </div>

                    {/* INVITATION LINK SHARING BLOCK */}
                    {activeMemberStat.preset_password && (
                      <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col gap-2">
                         <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block">Quick Share Invitation</label>
                         <p className="text-[11px] text-emerald-700 font-medium leading-relaxed">
                           Share these credentials with the employee. They can use the link below to securely join the firm workspace.
                         </p>
                         
                         <div className="bg-white/90 p-3 rounded-lg border border-emerald-200/60 text-xs font-mono text-gray-800 space-y-1.5 select-all mt-2 shadow-inner">
                            <div className="truncate"><span className="text-emerald-700 font-bold">Portal:</span> https://taxpro-nine.vercel.app</div>
                            <div className="truncate"><span className="text-emerald-700 font-bold">Login ID:</span> {activeMemberStat.email}</div>
                            <div className="truncate"><span className="text-emerald-700 font-bold">Password:</span> {activeMemberStat.preset_password}</div>
                         </div>

                         <div className="mt-2 grid grid-cols-3 gap-2">
                           <button
                             onClick={() => {
                               const text = `You've been invited to the TaxPro Cloud Workspace!\n\nPortal: https://taxpro-nine.vercel.app\nLogin ID: ${activeMemberStat.email}\nPassword: ${activeMemberStat.preset_password}\n\nPlease login safely to check in.`;
                               navigator.clipboard.writeText(text);
                               if (onShowToast) onShowToast('Credentials securely copied to clipboard!', 'success');
                             }}
                             className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95"
                           >
                             Copy
                           </button>
                           <button
                             onClick={() => {
                               const text = `You've been invited to the TaxPro Cloud Workspace!\n\nPortal: https://taxpro-nine.vercel.app\nLogin ID: ${activeMemberStat.email}\nPassword: ${activeMemberStat.preset_password}\n\nPlease login safely to check in.`;
                               const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                               window.open(whatsappUrl, '_blank');
                             }}
                             className="py-2.5 bg-[#25D366] hover:bg-[#1ebd5a] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-1.5"
                           >
                             WhatsApp
                           </button>
                           <button
                             onClick={() => {
                               const subject = `Your Account for TaxPro Workspace`;
                               const body = `You've been invited to the TaxPro Cloud Workspace!\n\nPortal: https://taxpro-nine.vercel.app\nLogin ID: ${activeMemberStat.email}\nPassword: ${activeMemberStat.preset_password}\n\nPlease login safely to check in.`;
                               const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(activeMemberStat.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                               window.open(gmailUrl, '_blank');
                             }}
                             className="py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center justify-center"
                           >
                             Email
                           </button>
                         </div>
                      </div>
                    )}

                 </div>
               </div>
             )}

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/80 text-center">
               <button 
                 onClick={() => setActiveMemberStat(null)}
                 className="px-6 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg hover:bg-gray-800 transition-all w-full"
               >
                 Close Overview
               </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
