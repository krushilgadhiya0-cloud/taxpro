import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  Users2, 
  UserPlus,
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
  Edit2,
  CreditCard,
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
  CheckCheck,
  ArrowLeft,
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
  ToggleRight,
  LifeBuoy,
  Save,
  Calendar,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  Sparkles,
  TrendingUp,
  BarChart3,
  ChevronRight,
  QrCode,
  IndianRupee
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { logAuditActivity } from '../../lib/auditLogger';
import { requireFirmSetup } from '../../lib/firmGatekeeper';
import { printHtml } from '../../lib/printHelper';
import { formatDate } from '../../lib/dateUtils';

const ALL_MODULES = [
  { id: 'dashboard', name: 'Dashboard Analytics', icon: LayoutDashboard, category: 'Management & Governance', desc: 'Real-time practice analytics, KPI metrics, revenue charts, and operational summary' },
  { id: 'clients', name: 'Clients Directory & KYC', icon: Users2, category: 'Operations & Practice', desc: 'Client account creation, profile records, and KYC document repository' },
  { id: 'projects', name: 'Projects & Milestones', icon: FolderKanban, category: 'Operations & Practice', desc: 'Project timelines, client milestones, deliverables, and progress tracking' },
  { id: 'tasks', name: 'Tasks Management', icon: CheckSquare, category: 'Operations & Practice', desc: 'Full practice task assignment, status updates, priority tags, and notes' },
  { id: 'attendance', name: 'Biometric Attendance & Leaves', icon: CalendarCheck, category: 'Operations & Practice', desc: 'Staff attendance check-in, punch logs, leave approvals, and calendar' },
  { id: 'support', name: 'Support & Help Center', icon: LifeBuoy, category: 'Operations & Practice', desc: 'Internal practice tickets, staff inquiries, and technical help desk' },
  { id: 'receipts_payments', name: 'Receipts & Payments Ledger', icon: Receipt, category: 'Financials & Billing', desc: 'Firm accounting journal, receipts ledger, expenditure vouchers, and cashflow' },
  { id: 'members_payment', name: 'Staff Payroll Processing', icon: DollarSign, category: 'Financials & Billing', desc: 'Monthly salary payouts, payroll records, bonuses, and salary slips' },
  { id: 'fees_tracking', name: 'Client Fees & Invoicing', icon: DollarSign, category: 'Financials & Billing', desc: 'Client fee invoicing, outstanding collection tracking, and payment receipts' },
  { id: 'communication', name: 'Firm Broadcast & Notices', icon: MessageSquare, category: 'Communication', desc: 'Firm-wide bulletin board, announcements, notices, and circulars' },
  { id: 'private_chat', name: 'Private Direct Chat', icon: MessageSquare, category: 'Communication', desc: 'Secure 1-on-1 staff direct messaging, attachments, and real-time chat' },
  { id: 'reports', name: 'Compliance & Audit Reports', icon: FileText, category: 'Compliance & Reports', desc: 'Statutory compliance tracking, filing status reports, and system audit trails' },
  { id: 'team_members', name: 'Team Members Directory', icon: User, category: 'Management & Governance', desc: 'Staff directory, account onboarding, role assignments, and permissions' },
  { id: 'departments', name: 'Departments Structure', icon: Building, category: 'Management & Governance', desc: 'Organizational hierarchy, practice departments, and designations' },
  { id: 'integrations', name: 'Integrations (SMTP / WhatsApp)', icon: Zap, category: 'Management & Governance', desc: 'SMTP email configuration, WhatsApp messaging API, and webhooks' },
  { id: 'settings', name: 'Firm Settings & Preferences', icon: Settings, category: 'Management & Governance', desc: 'Firm profile, financial year defaults, currency, and global parameters' }
];

export default function TeamMembersView({ userRole = 'Admin', onShowToast }) {
  const effectiveRole = userRole || localStorage.getItem('taxpro_user_role') || 'Admin';
  const isAdmin = 
    effectiveRole === 'Admin' || 
    effectiveRole === 'Administrator' || 
    effectiveRole === 'Super Admin' || 
    effectiveRole.toLowerCase().includes('admin') ||
    effectiveRole.toLowerCase().includes('manager');

  const [activeTab, setActiveTab] = useState('Members');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [credentialsSuccessModal, setCredentialsSuccessModal] = useState(null);
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [accessModalMember, setAccessModalMember] = useState(null);
  const [accessForm, setAccessForm] = useState({
    role: 'Employee',
    status: 'Active',
    permissions: {}
  });

  // Firm Tag States (Displays on all member tags)
  const [firmName, setFirmName] = useState(() => localStorage.getItem('taxpro_firm_name') || 'TaxPro Advisory & Tax Associates');
  const [firmTag, setFirmTag] = useState(() => localStorage.getItem('taxpro_firm_tag') || 'TaxPro');

  useEffect(() => {
    const handleFirmUpdate = () => {
      setFirmName(localStorage.getItem('taxpro_firm_name') || 'TaxPro Advisory & Tax Associates');
      setFirmTag(localStorage.getItem('taxpro_firm_tag') || 'TaxPro');
    };
    window.addEventListener('taxpro_firm_updated', handleFirmUpdate);
    return () => window.removeEventListener('taxpro_firm_updated', handleFirmUpdate);
  }, []);

  // Dedicated Permissions Page States
  const [permissionSearchQuery, setPermissionSearchQuery] = useState('');
  const [activePermissionCategory, setActivePermissionCategory] = useState('all');

  // Task Breakdown & Audit Modal State
  const [selectedMemberForTasks, setSelectedMemberForTasks] = useState(null);
  const [tasksTimeframe, setTasksTimeframe] = useState('all'); // 'all' | 'day' | 'month' | 'year' | 'today' | 'this_month' | 'this_year'
  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());
  const [tasksStatusFilter, setTasksStatusFilter] = useState('all'); // 'all' | 'in_progress' | 'completed' | 'pending' | 'overdue'
  const [tasksSearchQuery, setTasksSearchQuery] = useState('');

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

  // Form states for adding/inviting new member
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    upi_id: '',
    role: 'Employee',
    department: 'General',
    status: 'Active',
    salary: '₹50,000/mo',
    pan: '',
    bank_account: '',
    ifsc: '',
    emergency_contact: '',
    date_of_joining: new Date().toISOString().slice(0, 10),
    notes: '',
    password: ''
  });

  const [editingMember, setEditingMember] = useState(null);
  const [isInviting, setIsInviting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.name) {
      if (onShowToast) onShowToast('Email and Full Name are required.', 'error');
      return;
    }

    const cleanEmail = formData.email.toLowerCase().trim();
    const cleanName = formData.name.trim();

    // 1. Check if email is already present in existing directory list
    const isAlreadyLocal = members.some(m => (m.email || '').toLowerCase().trim() === cleanEmail);
    if (isAlreadyLocal) {
      if (onShowToast) onShowToast(`⚠️ Account Already Registered: "${cleanEmail}" is already in your practice directory. Duplicate accounts are prevented.`, 'error');
      return;
    }

    const purePhone = formData.phone.replace(/[^0-9]/g, '');
    if (formData.phone && purePhone.length !== 10) {
      if (onShowToast) onShowToast('Phone number must be exactly 10 digits!', 'error');
      return;
    }
    
    if (formData.password && formData.password.length < 6) {
      if (onShowToast) onShowToast('Preset Password must be at least 6 characters.', 'warning');
      return;
    }

    setIsInviting(true);

    // 2. Check in Supabase / PostgreSQL database
    try {
      const [usrCheck, memCheck] = await Promise.all([
        supabase.from('users').select('id, email, name, role').eq('email', cleanEmail).limit(1),
        supabase.from('team_members').select('id, email, name, role').eq('email', cleanEmail).limit(1)
      ]);
      if ((usrCheck?.data && usrCheck.data.length > 0) || (memCheck?.data && memCheck.data.length > 0)) {
        const found = usrCheck?.data?.[0] || memCheck?.data?.[0];
        if (onShowToast) onShowToast(`⚠️ Account Already Exists: "${cleanEmail}" is already registered in the system as ${found?.role || 'a member'}. Duplicate invitations are prevented.`, 'error');
        setIsInviting(false);
        return;
      }
    } catch (checkErr) {
      console.warn('[Check duplicate error]:', checkErr);
    }
    
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

      const effectivePassword = formData.password.trim() || `TaxPro@${Math.floor(1000 + Math.random() * 9000)}`;

      const smtpRaw = localStorage.getItem('taxpro_smtp');
      const smtpConfig = smtpRaw ? JSON.parse(smtpRaw) : null;
      const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;

      let registeredCredentials = null;
      let emailSent = false;

      // 1. Direct reliable upsert to PostgreSQL team_members table with ALL details
      const empId = `EMP-${Date.now().toString().slice(-6)}`;
      const memberPayload = {
        id: empId,
        name: cleanName,
        email: cleanEmail,
        phone: purePhone ? `+91 ${purePhone}` : (formData.phone || null),
        role: formData.role || 'Employee',
        department: formData.department || 'General',
        status: formData.status || 'Active',
        preset_password: effectivePassword,
        permissions: initialPerms,
        upi_id: formData.upi_id ? formData.upi_id.trim() : null,
        salary: formData.salary ? formData.salary.trim() : '₹50,000/mo',
        pan: formData.pan ? formData.pan.trim().toUpperCase() : null,
        bank_account: formData.bank_account ? formData.bank_account.trim() : null,
        ifsc: formData.ifsc ? formData.ifsc.trim().toUpperCase() : null,
        emergency_contact: formData.emergency_contact ? formData.emergency_contact.trim() : null,
        date_of_joining: formData.date_of_joining || new Date().toISOString().slice(0, 10),
        notes: formData.notes ? formData.notes.trim() : null,
        attendance: '98.5%',
        tasks_completed: 0,
        online: true
      };

      try {
        await supabase.from('team_members').upsert([memberPayload], { onConflict: 'email' });
      } catch (tmErr) {
        console.warn('[team_members upsert]:', tmErr);
      }

      // 2. Direct reliable upsert to PostgreSQL users table
      const userPayload = {
        id: `USR-${Date.now().toString().slice(-6)}`,
        email: cleanEmail,
        password: effectivePassword,
        name: cleanName,
        role: formData.role || 'Employee',
        company: firmName || 'TaxPro Enterprise',
        phone: purePhone ? `+91 ${purePhone}` : (formData.phone || null),
        phone_verified: true,
        lock_pin: '1234',
        status: 'Active'
      };

      try {
        await supabase.from('users').upsert([userPayload], { onConflict: 'email' });
      } catch (uErr) {
        console.warn('[users upsert]:', uErr);
      }

      // 3. Dispatch to server invitation mailer
      try {
        const resp = await fetch(`${baseUrl}/api/invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            smtpConfig,
            memberName: cleanName,
            targetEmail: cleanEmail,
            generatedPassword: effectivePassword,
            role: formData.role,
            department: formData.department,
            phone: purePhone ? `+91 ${purePhone}` : '',
            salary: memberPayload.salary,
            permissions: initialPerms,
            id: memberPayload.id,
            employeeId: memberPayload.id,
            origin: window.location.origin
          })
        });

        const data = await resp.json().catch(() => null);
        if (data && (data.success || data.emailDispatched)) {
          emailSent = true;
        }
      } catch (networkErr) {
        console.warn('[Invite Mailer Network Note]:', networkErr);
      }

      registeredCredentials = {
        email: cleanEmail,
        password: effectivePassword,
        role: formData.role,
        department: formData.department,
        name: cleanName,
        id: memberPayload.id
      };

      // Re-fetch directory and switch to appropriate tab
      await fetchMembers();
      if (formData.status === 'Pending Invite') {
        setActiveTab('Invitations');
      } else {
        setActiveTab('Members');
      }
      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

      // Close input modal and open Success Credentials Confirmation Modal
      setIsInviteModalOpen(false);
      setCredentialsSuccessModal({
        credentials: registeredCredentials,
        name: cleanName,
        emailDispatched: emailSent
      });

      logAuditActivity({
        action: 'ADD_MEMBER',
        module: 'Team Members',
        details: `Registered team member "${cleanName}" (${formData.role}) in Department "${formData.department}" with salary ${memberPayload.salary} [${cleanEmail}]`,
        metadata: { name: cleanName, role: formData.role, department: formData.department, email: cleanEmail }
      });

      if (onShowToast) {
        onShowToast(`✓ Team member "${cleanName}" successfully registered with full details!`, 'success');
      }

    } catch (err) {
      if (onShowToast) onShowToast(`Registration Failed: ${err.message}`, 'error');
    } finally {
      setIsInviting(false);
    }
    
    setFormData({
      name: '',
      email: '',
      phone: '',
      upi_id: '',
      role: 'Employee',
      department: 'General',
      status: 'Active',
      salary: '₹50,000/mo',
      pan: '',
      bank_account: '',
      ifsc: '',
      emergency_contact: '',
      date_of_joining: new Date().toISOString().slice(0, 10),
      notes: '',
      password: ''
    });
  };

  // Save changes to existing team member
  const handleSaveMemberEdits = async (e) => {
    e.preventDefault();
    if (!editingMember || !editingMember.name || !editingMember.email) {
      if (onShowToast) onShowToast('Full Name and Email Address are required.', 'error');
      return;
    }

    const cleanName = editingMember.name.trim();
    const cleanEmail = editingMember.email.trim().toLowerCase();
    const cleanPhone = (editingMember.phone || '').trim();

    setIsSavingEdit(true);

    try {
      const updatePayload = {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone || null,
        role: editingMember.role || 'Employee',
        department: editingMember.department || 'General',
        status: editingMember.status || 'Active',
        salary: editingMember.salary ? editingMember.salary.trim() : '₹50,000/mo',
        pan: editingMember.pan ? editingMember.pan.trim().toUpperCase() : null,
        bank_account: editingMember.bank_account ? editingMember.bank_account.trim() : null,
        ifsc: editingMember.ifsc ? editingMember.ifsc.trim().toUpperCase() : null,
        emergency_contact: editingMember.emergency_contact ? editingMember.emergency_contact.trim() : null,
        date_of_joining: editingMember.date_of_joining || null,
        upi_id: editingMember.upi_id ? editingMember.upi_id.trim() : null,
        notes: editingMember.notes ? editingMember.notes.trim() : null,
        updated_at: new Date().toISOString()
      };

      if (editingMember.preset_password && editingMember.preset_password.trim()) {
        updatePayload.preset_password = editingMember.preset_password.trim();
      }

      const { error: tmErr } = await supabase
        .from('team_members')
        .update(updatePayload)
        .eq('id', editingMember.id);

      if (tmErr) throw tmErr;

      // Also mirror to users table
      try {
        const userUpdatePayload = {
          name: cleanName,
          role: editingMember.role || 'Employee',
          phone: cleanPhone || null,
          updated_at: new Date().toISOString()
        };
        if (editingMember.preset_password && editingMember.preset_password.trim()) {
          userUpdatePayload.password = editingMember.preset_password.trim();
        }
        await supabase.from('users').update(userUpdatePayload).eq('email', cleanEmail);
      } catch (uErr) {
        console.warn('[User mirror update notice]:', uErr);
      }

      // Update local members state
      setMembers(prev => prev.map(m => m.id === editingMember.id ? { ...m, ...updatePayload } : m));

      if (selectedMemberForTasks && selectedMemberForTasks.id === editingMember.id) {
        setSelectedMemberForTasks(prev => ({ ...prev, ...updatePayload }));
      }

      logAuditActivity({
        action: 'UPDATE_MEMBER',
        module: 'Team Members',
        details: `Updated details for "${cleanName}" (${editingMember.role}) in Department "${editingMember.department}" [${cleanEmail}]`,
        metadata: { id: editingMember.id, name: cleanName, role: editingMember.role, department: editingMember.department }
      });

      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

      if (onShowToast) onShowToast(`✓ Profile & details successfully updated for ${cleanName}!`, 'success');
      setEditingMember(null);
    } catch (err) {
      console.error('[Edit Member Error]:', err);
      if (onShowToast) onShowToast(`Failed to update member: ${err.message}`, 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const copyCredentialsToClipboard = () => {
    if (!credentialsSuccessModal?.credentials) return;
    const { email, password, role } = credentialsSuccessModal.credentials;
    const portalName = role === 'Manager' ? 'Manager Portal' : (role === 'Administrator' ? 'Administrator Portal' : 'Employee Portal');
    const text = `❖ TaxPro Workspace Login Credentials\n------------------------------------\nPortal: ${portalName}\nURL: ${window.location.origin}\nLogin ID (Email): ${email}\nPassword: ${password}\n------------------------------------\nPlease login at ${window.location.origin}`;
    
    navigator.clipboard.writeText(text);
    setCopiedStatus(true);
    if (onShowToast) onShowToast('✓ Login Credentials copied to clipboard!', 'success');
    setTimeout(() => setCopiedStatus(false), 3000);
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

      logAuditActivity({
        action: isCurrentlyActive ? 'REVOKE_ACCESS' : 'RESTORE_ACCESS',
        module: 'Team Members',
        details: `${isCurrentlyActive ? 'Revoked' : 'Restored'} account access for "${member.name}" [${member.email || member.id}]`,
        metadata: { id: member.id, name: member.name, status: nextStatus }
      });

      if (isCurrentlyActive) {
        if (onShowToast) onShowToast(`🔒 Access REVOKED for ${member.name}. Account is now suspended.`, 'warning');
      } else {
        if (onShowToast) onShowToast(`✓ Access RESTORED for ${member.name}. Full permissions re-activated.`, 'success');
      }
    } catch (err) {
      if (onShowToast) onShowToast(`Failed to update access: ${err.message}`, 'error');
    }
  };

  // Simulate First Login (transitions invited member into Active Members)
  const handleSimulateFirstLogin = async (member) => {
    try {
      const { error } = await supabase.from('team_members').update({
        status: 'Active',
        online: true
      }).eq('id', member.id);

      if (error) throw error;

      try {
        await supabase.from('users').update({ status: 'Active' }).eq('email', member.email);
      } catch (e) {}

      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, status: 'Active', online: true } : m));
      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

      logAuditActivity({
        action: 'MEMBER_LOGIN',
        module: 'Team Members',
        details: `Simulated initial portal login and activated "${member.name}"`,
        metadata: { id: member.id, name: member.name }
      });

      if (onShowToast) onShowToast(`✓ ${member.name} completed first login and moved to Active Members directory!`, 'success');
      setActiveTab('Members');
    } catch (err) {
      if (onShowToast) onShowToast(`Failed to activate member: ${err.message}`, 'error');
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

      logAuditActivity({
        action: 'UPDATE_PERMISSIONS',
        module: 'Team Members',
        details: `Updated role to "${accessForm.role}" and permissions matrix for "${accessModalMember.name}" (${accessModalMember.email})`,
        metadata: { id: accessModalMember.id, name: accessModalMember.name, role: accessForm.role, status: accessForm.status }
      });

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

  const toggleCategory = (categoryName, shouldEnable) => {
    const updated = { ...accessForm.permissions };
    ALL_MODULES.filter(m => m.category === categoryName).forEach(m => {
      updated[m.id] = shouldEnable;
    });
    setAccessForm(prev => ({ ...prev, permissions: updated }));
  };

  const categoriesList = useMemo(() => {
    return Array.from(new Set(ALL_MODULES.map(m => m.category)));
  }, []);

  const activeModulesCount = useMemo(() => {
    return Object.values(accessForm.permissions || {}).filter(Boolean).length;
  }, [accessForm.permissions]);

  const accessPercentage = useMemo(() => {
    return Math.round((activeModulesCount / ALL_MODULES.length) * 100);
  }, [activeModulesCount]);

  const executeDelete = async () => {
    if (!deleteData) return;
    
    const targetMember = members.find(m => m.id === deleteData.id);
    const { error } = await supabase.from('team_members').delete().eq('id', deleteData.id);
    if (error) {
       if (onShowToast) onShowToast(`Failed to delete: ${error.message}`, 'error');
       return;
    }
    
    logAuditActivity({
      action: 'DELETE_MEMBER',
      module: 'Team Members',
      details: `Permanently deleted member account "${targetMember?.name || deleteData.id}" (${targetMember?.email || 'N/A'})`,
      metadata: { id: deleteData.id, name: targetMember?.name }
    });

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

     logAuditActivity({
       action: 'ARCHIVE_MEMBER',
       module: 'Team Members',
       details: `Moved team member "${obj.name}" to Past Employees archive`,
       metadata: { id: obj.id, name: obj.name }
     });

     setMembers(prev => prev.map(m => m.id === obj.id ? { ...m, status: 'Past' } : m));
     window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
     if (onShowToast) onShowToast(`${obj.name} successfully moved to Past Employees.`, 'info');
  };

  const handleRestore = async (e, obj) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.from('team_members').update({ status: 'Active' }).eq('id', obj.id);
      if (error) throw error;

      logAuditActivity({
        action: 'RESTORE_MEMBER',
        module: 'Team Members',
        details: `Restored team member "${obj.name}" from archive to Active status`,
        metadata: { id: obj.id, name: obj.name }
      });

      setMembers(prev => prev.map(m => m.id === obj.id ? { ...m, status: 'Active' } : m));
      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
      if (onShowToast) onShowToast(`✓ Restored ${obj.name} to Active Members directory.`, 'success');
    } catch (err) {
      if (onShowToast) onShowToast(`Failed to restore: ${err.message}`, 'error');
    }
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

  const getMemberTasks = (member) => {
    if (!member) return [];
    const cleanName = (member.name || '').toLowerCase().trim();
    const cleanEmail = (member.email || '').toLowerCase().trim();
    const cleanId = (member.id || '').toLowerCase().trim();
    return tasks.filter(t => {
      const assignee = (t.assignee || '').toLowerCase().trim();
      if (!assignee) return false;
      return (
        assignee === cleanName ||
        assignee === cleanEmail ||
        (cleanId && (assignee === cleanId || assignee.includes(cleanId))) ||
        assignee.includes(cleanName) ||
        cleanName.includes(assignee)
      );
    });
  };

  const memberTasksAll = useMemo(() => {
    if (!selectedMemberForTasks) return [];
    return getMemberTasks(selectedMemberForTasks);
  }, [selectedMemberForTasks, tasks]);

  const filteredMemberTasks = useMemo(() => {
    if (!selectedMemberForTasks) return [];
    const memberTasks = getMemberTasks(selectedMemberForTasks);

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const thisMonthStr = now.toISOString().slice(0, 7);
    const thisYearStr = now.getFullYear().toString();

    return memberTasks.filter(task => {
      const taskDate = task.due_date || task.dueDate || (task.created_at ? task.created_at.slice(0, 10) : '');

      // 1. Timeframe filter
      if (tasksTimeframe === 'day') {
        if (selectedDay && !taskDate.startsWith(selectedDay)) return false;
      } else if (tasksTimeframe === 'month') {
        if (selectedMonth && !taskDate.startsWith(selectedMonth)) return false;
      } else if (tasksTimeframe === 'year') {
        if (selectedYear && !taskDate.startsWith(selectedYear)) return false;
      } else if (tasksTimeframe === 'today') {
        if (!taskDate.startsWith(todayStr)) return false;
      } else if (tasksTimeframe === 'this_month') {
        if (!taskDate.startsWith(thisMonthStr)) return false;
      } else if (tasksTimeframe === 'this_year') {
        if (!taskDate.startsWith(thisYearStr)) return false;
      }

      // 2. Status filter
      if (tasksStatusFilter === 'in_progress' && task.status !== 'In Progress') return false;
      if (tasksStatusFilter === 'completed' && task.status !== 'Completed') return false;
      if (tasksStatusFilter === 'pending' && (task.status === 'Completed' || task.status === 'In Progress')) return false;
      if (tasksStatusFilter === 'overdue') {
        const isPast = taskDate && taskDate < todayStr;
        if (!isPast || task.status === 'Completed') return false;
      }

      // 3. Search query
      if (tasksSearchQuery.trim()) {
        const q = tasksSearchQuery.toLowerCase();
        const titleMatch = (task.title || '').toLowerCase().includes(q);
        const clientMatch = (task.client || '').toLowerCase().includes(q);
        const projMatch = (task.project || '').toLowerCase().includes(q);
        const catMatch = (task.category || '').toLowerCase().includes(q);
        if (!titleMatch && !clientMatch && !projMatch && !catMatch) return false;
      }

      return true;
    });
  }, [selectedMemberForTasks, tasks, tasksTimeframe, selectedDay, selectedMonth, selectedYear, tasksStatusFilter, tasksSearchQuery]);

  const memberMetrics = useMemo(() => {
    if (!selectedMemberForTasks) return { total: 0, inProgress: 0, completed: 0, pending: 0, overdue: 0, rate: 0 };
    const list = memberTasksAll;
    const total = list.length;
    const inProgress = list.filter(t => t.status === 'In Progress').length;
    const completed = list.filter(t => t.status === 'Completed').length;
    const pending = list.filter(t => t.status !== 'In Progress' && t.status !== 'Completed').length;
    const todayStr = new Date().toISOString().slice(0, 10);
    const overdue = list.filter(t => (t.due_date || t.dueDate) && (t.due_date || t.dueDate) < todayStr && t.status !== 'Completed').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 100;

    return { total, inProgress, completed, pending, overdue, rate };
  }, [selectedMemberForTasks, memberTasksAll]);

  const handlePrintMemberReport = () => {
    if (!selectedMemberForTasks) return;

    const member = selectedMemberForTasks;
    const list = filteredMemberTasks;
    const metrics = memberMetrics;
    const now = formatDate(new Date());

    const timeframeLabel = tasksTimeframe === 'day' ? `Specific Day: ${formatDate(selectedDay)}`
      : tasksTimeframe === 'month' ? `Specific Month: ${selectedMonth}`
      : tasksTimeframe === 'year' ? `Year: ${selectedYear}`
      : tasksTimeframe === 'today' ? 'Today'
      : tasksTimeframe === 'this_month' ? 'This Month'
      : tasksTimeframe === 'this_year' ? 'This Year'
      : 'All Time Deliverables';

    logAuditActivity({
      action: 'PRINT_MEMBER_TASKS_REPORT',
      module: 'Team Members',
      details: `Printed task audit report for ${member.name} (${tasksTimeframe})`,
      metadata: { memberEmail: member.email, timeframe: tasksTimeframe }
    });

    const tableRows = list.map((t, idx) => `
      <tr style="border-bottom: 1px solid #e5e7eb; background: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
        <td style="padding: 7px 10px; font-weight: 700; color: #111827;">${t.title || 'Untitled Task'}</td>
        <td style="padding: 7px 10px; color: #4b5563;">${t.client || 'Practice'}</td>
        <td style="padding: 7px 10px; color: #4b5563;">${t.category || 'General'}</td>
        <td style="padding: 7px 10px; font-family: monospace; color: #374151;">${formatDate(t.due_date || t.dueDate)}</td>
        <td style="padding: 7px 10px; color: #374151;">${t.priority || 'Normal'}</td>
        <td style="padding: 7px 10px; text-align: right;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 9.5px; font-weight: 700; 
            ${t.status === 'Completed' ? 'background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0;' :
              t.status === 'In Progress' ? 'background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe;' :
              'background: #fef3c7; color: #92400e; border: 1px solid #fde68a;'}">
            ${t.status || 'Pending'}
          </span>
        </td>
      </tr>
    `).join('');

    const bodyHtml = `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
        <div>
          <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8;">Team Member</div>
          <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 2px;">${member.name}</div>
        </div>
        <div>
          <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8;">Assigned Role</div>
          <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 2px;">${member.role || 'Employee'}</div>
        </div>
        <div>
          <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8;">Department</div>
          <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 2px;">${member.department || 'Tax & Compliance'}</div>
        </div>
        <div>
          <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8;">Timeframe</div>
          <div style="font-size: 12px; font-weight: 800; color: #5b52e0; margin-top: 2px;">${timeframeLabel}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 14px;">
        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; text-align: center; background: #f8fafc;">
          <div style="font-size: 9px; font-weight: 800; color: #64748b;">Total</div>
          <div style="font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 2px;">${metrics.total}</div>
        </div>
        <div style="border: 1px solid #bfdbfe; border-radius: 6px; padding: 6px; text-align: center; background: #eff6ff;">
          <div style="font-size: 9px; font-weight: 800; color: #2563eb;">In Progress</div>
          <div style="font-size: 14px; font-weight: 900; color: #1d4ed8; margin-top: 2px;">${metrics.inProgress}</div>
        </div>
        <div style="border: 1px solid #bbf7d0; border-radius: 6px; padding: 6px; text-align: center; background: #f0fdf4;">
          <div style="font-size: 9px; font-weight: 800; color: #16a34a;">Completed</div>
          <div style="font-size: 14px; font-weight: 900; color: #15803d; margin-top: 2px;">${metrics.completed}</div>
        </div>
        <div style="border: 1px solid #fde68a; border-radius: 6px; padding: 6px; text-align: center; background: #fffbeb;">
          <div style="font-size: 9px; font-weight: 800; color: #d97706;">Pending</div>
          <div style="font-size: 14px; font-weight: 900; color: #b45309; margin-top: 2px;">${metrics.pending}</div>
        </div>
        <div style="border: 1px solid #ddd6fe; border-radius: 6px; padding: 6px; text-align: center; background: #f5f3ff;">
          <div style="font-size: 9px; font-weight: 800; color: #7c3aed;">Rate</div>
          <div style="font-size: 14px; font-weight: 900; color: #6d28d9; margin-top: 2px;">${metrics.rate}%</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Task Title & Scope</th>
            <th>Client / Entity</th>
            <th>Category</th>
            <th>Due Date</th>
            <th>Priority</th>
            <th style="text-align: right;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${list.length > 0 ? tableRows : '<tr><td colspan="6" style="padding: 16px; text-align: center; color: #94a3b8; font-style: italic;">No tasks found for the selected timeframe.</td></tr>'}
        </tbody>
      </table>
    `;

    printHtml(`Task Audit Dossier - ${member.name}`, bodyHtml);
    if (onShowToast) onShowToast(`🖨️ Generating task audit report for ${member.name}...`, 'info');
  };

  const triggerPrint = () => {
    logAuditActivity({
      action: 'PRINT_DOCUMENT',
      module: 'Team Members',
      details: `Printed Team Directory and Access Control hierarchy view (${members.length} members)`,
      metadata: { count: members.length }
    });

    const rows = currentList.map((m, idx) => `
      <tr style="border-bottom: 1px solid #e5e7eb; background: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
        <td style="padding: 7px 10px; font-weight: 700; color: #111827;">${m.name || 'Unnamed'}</td>
        <td style="padding: 7px 10px; color: #4b5563;">${m.email || 'N/A'}</td>
        <td style="padding: 7px 10px; color: #4b5563;">${m.phone || 'N/A'}</td>
        <td style="padding: 7px 10px; font-weight: 600; color: #374151;">${m.role || 'Employee'}</td>
        <td style="padding: 7px 10px; color: #4b5563;">${m.department || 'General'}</td>
        <td style="padding: 7px 10px; text-align: right;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9.5px; font-weight: 700;
            ${m.status === 'Active' ? 'background: #d1fae5; color: #065f46;' : 'background: #fee2e2; color: #991b1b;'}">
            ${m.status || 'Active'}
          </span>
        </td>
      </tr>
    `).join('');

    const bodyHtml = `
      <div style="margin-bottom: 12px; font-weight: 800; font-size: 13px; color: #1e293b;">
        Team Members & Workforce Directory (${currentList.length} Active Accounts)
      </div>
      <table>
        <thead>
          <tr>
            <th>Member Name</th>
            <th>Email Address</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Department</th>
            <th style="text-align: right;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    printHtml('Team Members Directory', bodyHtml);
    if (onShowToast) onShowToast('🖨️ Generating printable team directory...', 'info');
  };

  // ============================================================================
  // FULL-PAGE DEDICATED PERMISSIONS & ACCESS CONTROL WORKSPACE
  // ============================================================================
  if (accessModalMember) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in">
        
        {/* Top Header & Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAccessModalMember(null)}
              className="p-2.5 rounded-2xl bg-gray-100 hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 border border-gray-200 transition-all flex items-center gap-2 font-bold text-xs cursor-pointer shadow-2xs group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Directory</span>
            </button>
            <div className="h-6 w-[1px] bg-gray-200 hidden sm:block" />
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Staff Access & Security Center
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-outfit text-gray-900 tracking-tight">
                Module Permissions: <span className="text-[#5b52e0]">{accessModalMember.name}</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setAccessModalMember(null)}
              className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors cursor-pointer"
            >
              Discard Changes
            </button>
            <button
              type="button"
              onClick={handleSaveAccessPermissions}
              disabled={isSavingAccess}
              className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#5b52e0] to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 rounded-2xl shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSavingAccess ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save & Apply Permissions</span>
            </button>
          </div>
        </div>

        {/* Member Profile & Access Level Hero Banner */}
        <div className="bg-gradient-to-br from-gray-950 via-[#181c32] to-indigo-950 rounded-3xl p-6 text-white border border-gray-800 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Member Identity Details */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 via-teal-400 to-emerald-400 p-[2px] shadow-lg flex-shrink-0">
              <div className="w-full h-full bg-gray-900 rounded-3xl flex items-center justify-center font-black text-2xl text-teal-300 uppercase font-mono">
                {accessModalMember.name ? accessModalMember.name.charAt(0) : accessModalMember.email.charAt(0)}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black font-outfit text-white tracking-tight">
                  {accessModalMember.name}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold font-mono">
                  {accessForm.role}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-black font-mono">
                  🏢 {firmTag}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${
                  accessForm.status === 'Active' 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                    : 'bg-red-500/20 text-red-300 border-red-500/30'
                }`}>
                  {accessForm.status === 'Active' ? <Check className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {accessForm.status}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-300 mt-2 flex-wrap">
                <span className="flex items-center gap-1.5 font-mono">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  {accessModalMember.email}
                </span>
                {accessModalMember.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    {accessModalMember.phone}
                  </span>
                )}
                {accessModalMember.department && (
                  <span className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-gray-400" />
                    Dept: {accessModalMember.department}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Module Coverage KPI & Preset Action Pills */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 border-t lg:border-t-0 lg:border-l border-gray-800 pt-4 lg:pt-0 lg:pl-6">
            
            <div className="flex flex-col lg:items-end">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300">Total System Coverage</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black font-mono text-white">{activeModulesCount}</span>
                <span className="text-xs text-gray-400 font-medium">of {ALL_MODULES.length} Modules ({accessPercentage}%)</span>
              </div>
              <div className="w-48 bg-gray-800 h-2 rounded-full mt-1.5 overflow-hidden border border-gray-700">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    accessPercentage > 75 ? 'bg-emerald-400' : accessPercentage > 40 ? 'bg-indigo-400' : 'bg-amber-400'
                  }`} 
                  style={{ width: `${accessPercentage}%` }} 
                />
              </div>
            </div>

            {/* Quick Presets Bar */}
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <span className="text-[11px] font-bold text-gray-400 mr-1">Quick Presets:</span>
              <button 
                type="button" 
                onClick={() => applyPreset('all')}
                className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold rounded-xl border border-emerald-500/40 text-xs transition-all cursor-pointer"
              >
                👑 Grant All (Admin)
              </button>
              <button 
                type="button" 
                onClick={() => applyPreset('manager')}
                className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold rounded-xl border border-indigo-500/40 text-xs transition-all cursor-pointer"
              >
                👔 Manager
              </button>
              <button 
                type="button" 
                onClick={() => applyPreset('employee')}
                className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 text-gray-300 font-bold rounded-xl border border-gray-600 text-xs transition-all cursor-pointer"
              >
                💼 Staff Default
              </button>
              <button 
                type="button" 
                onClick={() => applyPreset('revoke')}
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold rounded-xl border border-red-500/40 text-xs transition-all cursor-pointer"
              >
                🔒 Revoke All
              </button>
            </div>

          </div>

        </div>

        {/* Section 1: Role Selection & Master Status Controls */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
          
          {/* Role Cards */}
          <div className="flex-1">
            <span className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5 mb-3">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              Designated Account Role
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { role: 'Administrator', badge: '👑 Administrator', desc: 'Full unrestricted governance, financials, logs & settings' },
                { role: 'Manager', badge: '👔 Practice Manager', desc: 'Team workload supervisor, project milestones & operations' },
                { role: 'Employee', badge: '💼 Staff / Employee', desc: 'Assigned personal tasks, client KYC, leaves & timesheets' }
              ].map(r => {
                const isSelected = accessForm.role === r.role;
                return (
                  <div
                    key={r.role}
                    onClick={() => setAccessForm(prev => ({ ...prev, role: r.role }))}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected 
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs' 
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black ${isSelected ? 'text-indigo-950' : 'text-gray-800'}`}>
                        {r.badge}
                      </span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-tight">{r.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-[1px] bg-gray-200 hidden md:block self-stretch" />

          {/* Master Status Control */}
          <div className="w-full md:w-64 flex flex-col justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5 mb-3">
                <Lock className="w-4 h-4 text-indigo-600" />
                Workspace Login Status
              </span>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">
                Revoking access instantly blocks user authentication while preserving all historical work records.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-200">
              <span className="text-xs font-bold text-gray-700">Account Access:</span>
              <button
                type="button"
                onClick={() => setAccessForm(prev => ({
                  ...prev,
                  status: prev.status === 'Active' ? 'Access Revoked' : 'Active'
                }))}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  accessForm.status === 'Active'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {accessForm.status === 'Active' ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{accessForm.status === 'Active' ? 'Active' : 'Revoked'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Section 2: Search Bar & Category Filter Pills */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            <button
              type="button"
              onClick={() => setActivePermissionCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activePermissionCategory === 'all'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Modules ({ALL_MODULES.length})
            </button>
            {categoriesList.map(cat => {
              const count = ALL_MODULES.filter(m => m.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActivePermissionCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activePermissionCategory === cat
                      ? 'bg-[#5b52e0] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72 flex-shrink-0">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search module permissions..."
              value={permissionSearchQuery}
              onChange={(e) => setPermissionSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white text-gray-800 transition-all"
            />
            {permissionSearchQuery && (
              <button onClick={() => setPermissionSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>

        {/* Section 3: Categorized Granular Modules Grid */}
        <div className="space-y-6">
          {categoriesList
            .filter(cat => activePermissionCategory === 'all' || activePermissionCategory === cat)
            .map(cat => {
              const catModules = ALL_MODULES.filter(m => {
                if (m.category !== cat) return false;
                if (permissionSearchQuery.trim()) {
                  const q = permissionSearchQuery.toLowerCase();
                  return m.name.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q);
                }
                return true;
              });

              if (catModules.length === 0) return null;

              const enabledInCat = catModules.filter(m => accessForm.permissions[m.id] !== false).length;

              return (
                <div key={cat} className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex flex-col gap-4">
                  
                  {/* Category Header Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
                    <div>
                      <h4 className="text-base font-black font-outfit text-gray-900 flex items-center gap-2">
                        <span>{cat}</span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-extrabold font-mono">
                          {enabledInCat} / {catModules.length} Active
                        </span>
                      </h4>
                    </div>

                    {/* Quick Category Enable / Disable */}
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => toggleCategory(cat, true)}
                        className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      >
                        ✓ Enable All
                      </button>
                      <span className="text-gray-300">•</span>
                      <button
                        type="button"
                        onClick={() => toggleCategory(cat, false)}
                        className="px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        ✕ Disable All
                      </button>
                    </div>
                  </div>

                  {/* Modules Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {catModules.map(m => {
                      const Icon = m.icon;
                      const isEnabled = accessForm.permissions[m.id] !== false;

                      return (
                        <div
                          key={m.id}
                          onClick={() => toggleSinglePermission(m.id)}
                          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4 select-none ${
                            isEnabled 
                              ? 'bg-gradient-to-r from-indigo-50/60 to-white border-indigo-300/80 shadow-xs hover:border-indigo-400' 
                              : 'bg-gray-50 border-gray-200 hover:border-gray-300 opacity-60 hover:opacity-80'
                          }`}
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                              isEnabled 
                                ? 'bg-gradient-to-tr from-[#5b52e0] to-indigo-700 text-white shadow-md shadow-indigo-500/20' 
                                : 'bg-gray-200 text-gray-500'
                            }`}>
                              <Icon className="w-5 h-5" />
                            </div>

                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-extrabold truncate ${isEnabled ? 'text-gray-900' : 'text-gray-600'}`}>
                                  {m.name}
                                </span>
                                {isEnabled && (
                                  <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-extrabold uppercase tracking-wider">
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 font-normal leading-relaxed">
                                {m.desc}
                              </p>
                            </div>
                          </div>

                          {/* Large Interactive iOS-style Toggle Switch */}
                          <div className="flex-shrink-0 pl-2">
                            <div className={`w-12 h-6 rounded-full p-0.5 transition-colors relative flex items-center ${
                              isEnabled ? 'bg-[#5b52e0]' : 'bg-gray-300'
                            }`}>
                              <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                                isEnabled ? 'translate-x-6' : 'translate-x-0'
                              }`} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}
        </div>

        {/* Bottom Sticky Action Bar */}
        <div className="sticky bottom-4 z-40 bg-white/95 backdrop-blur-md p-4 rounded-3xl border border-gray-200 shadow-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
              {activeModulesCount}
            </div>
            <div className="text-xs text-gray-600 font-medium">
              <strong className="text-gray-900">{activeModulesCount} of {ALL_MODULES.length}</strong> modules authorized for <strong className="text-indigo-600">{accessModalMember.name}</strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAccessModalMember(null)}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAccessPermissions}
              disabled={isSavingAccess}
              className="px-6 py-2 text-xs font-bold text-white bg-[#5b52e0] hover:bg-indigo-700 rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSavingAccess ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
              <span>Save & Apply Permissions</span>
            </button>
          </div>
        </div>

      </div>
    );
  }

  // ============================================================================
  // MAIN TEAM DIRECTORY VIEW
  // ============================================================================
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
            <button 
              onClick={() => {
                if (!requireFirmSetup(onShowToast)) return;
                setIsInviteModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md transition-all cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4" /> + Add New Member
            </button>
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
        <div className="flex flex-col items-center justify-center py-20 sm:py-32 opacity-90 bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-gray-400" strokeWidth={2.5} />
          </div>
          <h3 className="text-lg font-black font-outfit text-gray-800 mb-1">No {activeTab.toLowerCase()} found</h3>
          <p className="text-xs text-gray-500 max-w-sm">Invite new team members or configure staff accounts to populate this workspace.</p>
          <button
            type="button"
            onClick={() => {
              if (!requireFirmSetup(onShowToast)) return;
              setIsInviteModalOpen(true);
            }}
            className="mt-4 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4" /> + Add New Team Member
          </button>
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
                   if (activeTab === 'Members') {
                     setSelectedMemberForTasks(obj);
                     setTasksTimeframe('all');
                     setTasksStatusFilter('all');
                     setTasksSearchQuery('');
                   }
                }}
                className={`border rounded-2xl p-5 bg-white shadow-sm flex flex-col justify-between hover:shadow-lg transition-all relative ${
                  isRevoked ? 'border-red-200 bg-red-50/10' : 'border-gray-200'
                } ${activeTab === 'Members' ? 'cursor-pointer hover:border-indigo-300 hover:-translate-y-1' : ''}`}
              >
                {/* Member Header */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 font-black border text-sm uppercase shadow-2xs ${
                        isRevoked 
                          ? 'bg-red-100 text-red-700 border-red-200' 
                          : obj.role === 'Administrator'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : obj.role === 'Manager'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
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
                        <div className="text-xs text-gray-500 truncate mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black font-mono border ${
                            obj.role === 'Administrator'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : obj.role === 'Manager'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-teal-50 text-teal-800 border-teal-200'
                          }`}>
                            <span>{obj.role === 'Administrator' ? '👑' : obj.role === 'Manager' ? '👔' : '🧑‍💻'}</span>
                            <span>{obj.role || 'Employee'}</span>
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-black font-mono shadow-2xs">
                            🏢 {firmTag}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Contact & Detailed Profile Info */}
                  <div className="pt-2.5 border-t border-gray-100 flex flex-col gap-1.5 text-xs text-gray-600 font-medium">
                     <div className="flex items-center gap-2 truncate">
                       <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                       <span className="truncate">{obj.email || 'No email'}</span>
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
                     {obj.salary && (
                       <div className="flex items-center gap-2 truncate text-emerald-700 font-bold">
                         <IndianRupee className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                         <span>Salary: {obj.salary}</span>
                       </div>
                     )}
                     {obj.date_of_joining && (
                       <div className="flex items-center gap-2 truncate text-gray-500 text-[11px]">
                         <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                         <span>Joined: {formatDate(obj.date_of_joining)}</span>
                       </div>
                     )}
                     {obj.pan && (
                       <div className="flex items-center gap-2 truncate font-mono text-[11px] text-gray-600">
                         <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                         <span>PAN: {obj.pan}</span>
                       </div>
                     )}
                     {obj.upi_id && (
                       <div className="flex items-center gap-2 truncate font-mono text-[11px] text-indigo-600">
                         <QrCode className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                         <span>UPI: {obj.upi_id}</span>
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
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMember({ ...obj });
                        }}
                        className="p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
                        title="Edit Full Member Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {activeTab !== 'Past' && (
                        <button 
                          type="button"
                          onClick={(e) => handleArchive(e, obj)}
                          className="p-1.5 text-gray-400 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-orange-200"
                          title="Archive to Past Employees"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {activeTab === 'Past' && (
                        <button 
                          type="button"
                          onClick={(e) => handleRestore(e, obj)}
                          className="p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
                          title="Restore to Active Members"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteData({ id: obj.id, type: activeTab, name: obj.name || obj.email });
                        }}
                        className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-200"
                        title="Permanently Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Task Workload Summary & Drill-Down Ribbon */}
                  {activeTab === 'Members' && (() => {
                    const memberTasks = getMemberTasks(obj);
                    const inProgCount = memberTasks.filter(t => t.status === 'In Progress').length;
                    const completedCount = memberTasks.filter(t => t.status === 'Completed').length;
                    const pendingCount = memberTasks.filter(t => t.status !== 'In Progress' && t.status !== 'Completed').length;

                    return (
                      <div className="mt-1 pt-2 border-t border-gray-100 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-extrabold text-gray-500 uppercase text-[10px] tracking-wider flex items-center gap-1">
                            <CheckSquare className="w-3 h-3 text-indigo-500" />
                            Workload Tasks
                          </span>
                          <span className="font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full text-[10px]">
                            {memberTasks.length} Total
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold">
                          <div className="p-1.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 flex flex-col items-center shadow-2xs">
                            <span className="text-xs font-black">{inProgCount}</span>
                            <span className="text-[9px] opacity-80">In Progress</span>
                          </div>
                          <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex flex-col items-center shadow-2xs">
                            <span className="text-xs font-black">{completedCount}</span>
                            <span className="text-[9px] opacity-80">Completed</span>
                          </div>
                          <div className="p-1.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-100 flex flex-col items-center shadow-2xs">
                            <span className="text-xs font-black">{pendingCount}</span>
                            <span className="text-[9px] opacity-80">Pending</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMemberForTasks(obj);
                            setTasksTimeframe('all');
                            setTasksStatusFilter('all');
                            setTasksSearchQuery('');
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 hover:from-black hover:to-indigo-900 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer group"
                        >
                          <Activity className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                          <span>View Tasks & Print Report</span>
                          <ChevronRight className="w-3 h-3 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    );
                  })()}

                  {/* ADMIN ACCESS CONTROL BUTTONS */}
                  {isAdmin && activeTab === 'Members' && (
                    <div className="grid grid-cols-3 gap-1.5 mt-1 z-10" onClick={(e) => e.stopPropagation()}>
                      
                      {/* Edit Details Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMember({ ...obj });
                        }}
                        className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-xl border border-emerald-200 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                        title="Edit Member Details"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      {/* Detailed Permissions Modal Button */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenAccessModal(e, obj)}
                        className="py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-xl border border-indigo-200 flex items-center justify-center gap-1 transition-all cursor-pointer"
                        title="Manage Permissions"
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>Perms</span>
                      </button>

                      {/* Quick Revoke / Grant Access Toggle */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleQuickAccess(e, obj)}
                        className={`py-1.5 px-2 text-[11px] font-bold rounded-xl border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          isRevoked
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300'
                            : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-300'
                        }`}
                        title={isRevoked ? 'Unlock Account' : 'Lock Account'}
                      >
                        {isRevoked ? (
                          <>
                            <Unlock className="w-3 h-3" />
                            <span>Unlock</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3" />
                            <span>Lock</span>
                          </>
                        )}
                      </button>

                    </div>
                  )}

                  {/* INVITATION SPECIFIC ACTIONS (Awaiting 1st Login) */}
                  {activeTab === 'Invitations' && (
                    <div className="flex flex-col gap-1.5 mt-1 z-10" onClick={(e) => e.stopPropagation()}>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const text = `❖ TaxPro Workspace Login Credentials\n------------------------------------\nPortal: ${obj.role} Portal\nURL: ${window.location.origin}\nLogin ID (Email): ${obj.email}\nPassword: ${obj.preset_password || 'password123'}\n------------------------------------\nPlease login at ${window.location.origin}`;
                            navigator.clipboard.writeText(text);
                            if (onShowToast) onShowToast(`✓ Copied login details for ${obj.name}!`, 'success');
                          }}
                          className="py-1.5 px-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded-xl border border-gray-300 flex items-center justify-center gap-1 transition-all cursor-pointer"
                          title="Copy login details"
                        >
                          <KeyRound className="w-3 h-3 text-gray-500" />
                          <span>Copy Login</span>
                        </button>

                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await handleSimulateFirstLogin(obj);
                          }}
                          className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-xl border border-emerald-300 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                          title="Simulate 1st login and move directly to Active Members"
                        >
                          <CheckSquare className="w-3 h-3 text-emerald-600" />
                          <span>1st Login (Activate)</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteData({ id: obj.id, type: 'Invitations', name: obj.name || obj.email });
                        }}
                        className="py-1.5 px-2 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Cancel / Revoke Invitation
                      </button>
                    </div>
                  )}

                  {/* PAST EMPLOYEES SPECIFIC ACTIONS */}
                  {activeTab === 'Past' && (
                    <div className="flex gap-1.5 mt-2 z-10" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handleRestore(e, obj)}
                        className="flex-1 py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-xl border border-emerald-300 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restore Active
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteData({ id: obj.id, type: 'Past', name: obj.name || obj.email });
                        }}
                        className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-bold rounded-xl border border-red-300 flex items-center justify-center gap-1 transition-all cursor-pointer"
                        title="Delete Permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  )}

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 
        ========================================================================
        ADD / INVITE TEAM MEMBER MODAL FORM (FULL DETAILS)
        ========================================================================
      */}
      {isInviteModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsInviteModalOpen(false); }}
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-slate-900 tracking-tight">
                    Add / Register Team Member
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Register a new staff member with complete profile, payroll, KYC, and credentials
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setIsInviteModalOpen(false)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 text-xs font-semibold overscroll-contain chat-custom-scrollbar">
              
              {/* SECTION 1: Personal & Employment Identity */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4.5 sm:p-5 flex flex-col gap-3.5 shadow-2xs">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 text-slate-900 font-extrabold text-xs uppercase tracking-wider">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>1. Identity & Designation</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-slate-700 block mb-1">Full Name <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        placeholder="e.g. Rahul Sharma"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors shadow-2xs"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1">Official Email Address <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="email" 
                        placeholder="e.g. rahul@firm.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors shadow-2xs"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1">Phone Number (10 Digits)</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="tel" 
                        placeholder="e.g. 9876543210"
                        maxLength={10}
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/[^0-9]/g, '')})}
                        className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors font-mono shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-slate-700 block mb-1">Role / Designation</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors cursor-pointer shadow-2xs"
                    >
                      <option value="Employee">Employee (Associate)</option>
                      <option value="Manager">Department Manager</option>
                      <option value="Administrator">Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1">Department</label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors cursor-pointer shadow-2xs"
                    >
                      <option value="General">General</option>
                      {departmentsList.map(d => (
                         <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1">Initial Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors cursor-pointer shadow-2xs"
                    >
                      <option value="Active">Active (Ready Now)</option>
                      <option value="Pending Invite">Pending Invite</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Payroll & Compensation */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4.5 sm:p-5 flex flex-col gap-3.5 shadow-2xs">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 text-slate-900 font-extrabold text-xs uppercase tracking-wider">
                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                  <span>2. Payroll & Compensation</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-slate-700 block mb-1">Monthly Salary / CTC</label>
                    <div className="relative">
                      <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        placeholder="e.g. ₹50,000/mo"
                        value={formData.salary}
                        onChange={(e) => setFormData({...formData, salary: e.target.value})}
                        className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors shadow-2xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1">UPI ID / VPA</label>
                    <div className="relative">
                      <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        placeholder="e.g. rahul@okaxis or 9876543210@paytm"
                        value={formData.upi_id || ''}
                        onChange={(e) => setFormData({...formData, upi_id: e.target.value})}
                        className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors font-mono shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-slate-700 block mb-1">Bank Account Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 50100234567890"
                      value={formData.bank_account || ''}
                      onChange={(e) => setFormData({...formData, bank_account: e.target.value})}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors font-mono shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1">IFSC Code</label>
                    <input 
                      type="text" 
                      placeholder="e.g. HDFC0001234"
                      value={formData.ifsc || ''}
                      onChange={(e) => setFormData({...formData, ifsc: e.target.value.toUpperCase()})}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors font-mono uppercase shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: KYC & Compliance */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4.5 sm:p-5 flex flex-col gap-3.5 shadow-2xs">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 text-slate-900 font-extrabold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>3. KYC & Service Details</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-slate-700 block mb-1">Permanent Account Number (PAN)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. ABCDE1234F"
                      maxLength={10}
                      value={formData.pan || ''}
                      onChange={(e) => setFormData({...formData, pan: e.target.value.toUpperCase()})}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors font-mono uppercase shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1">Date of Joining</label>
                    <input 
                      type="date" 
                      value={formData.date_of_joining || ''}
                      onChange={(e) => setFormData({...formData, date_of_joining: e.target.value})}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors cursor-pointer shadow-2xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1">Emergency Contact Phone</label>
                    <input 
                      type="tel" 
                      placeholder="e.g. 9811122233"
                      value={formData.emergency_contact || ''}
                      onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors font-mono shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: Credentials & Notes */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4.5 sm:p-5 flex flex-col gap-3.5 shadow-2xs">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 text-slate-900 font-extrabold text-xs uppercase tracking-wider">
                  <KeyRound className="w-4 h-4 text-purple-600" />
                  <span>4. Account Credentials & Notes</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-slate-700 block mb-1">Preset Temporary Password</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        placeholder="e.g. TaxPro@2026"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors font-mono shadow-2xs"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Leave blank to auto-generate a secure token.</span>
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1">Internal Notes</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Assigned to GST advisory and audit engagements"
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Sticky Actions */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 -mx-6 -mb-6 mt-3">
                <button 
                  type="button" 
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isInviting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save & Register Member</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        EDIT TEAM MEMBER FULL PROFILE & DETAILS MODAL
        ========================================================================
      */}
      {editingMember && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setEditingMember(null); }}
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-slate-900 tracking-tight">
                    Edit Team Member Profile
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update personal, designation, compensation, and KYC records for <strong className="text-slate-800">{editingMember.name}</strong>
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setEditingMember(null)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMemberEdits} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 text-xs font-semibold overscroll-contain chat-custom-scrollbar">
              
              {/* SECTION 1: Identity & Designation */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4.5 sm:p-5 flex flex-col gap-3.5 shadow-2xs">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 text-slate-900 font-extrabold text-xs uppercase tracking-wider">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>1. Identity & Designation</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-slate-700 block mb-1">Full Name <span className="text-rose-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      placeholder="Full Name"
                      value={editingMember.name || ''}
                      onChange={(e) => setEditingMember({...editingMember, name: e.target.value})}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1">Official Email Address <span className="text-rose-500">*</span></label>
                    <input 
                      type="email" 
                      required
                      placeholder="Email Address"
                      value={editingMember.email || ''}
                      onChange={(e) => setEditingMember({...editingMember, email: e.target.value})}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1">Phone Number</label>
                    <input 
                      type="tel" 
                      placeholder="Phone"
                      value={editingMember.phone || ''}
                      onChange={(e) => setEditingMember({...editingMember, phone: e.target.value})}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors font-mono shadow-2xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-slate-700 block mb-1">Role / Designation</label>
                    <select
                      value={editingMember.role || 'Employee'}
                      onChange={(e) => setEditingMember({...editingMember, role: e.target.value})}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors cursor-pointer shadow-2xs"
                    >
                      <option value="Employee">Employee (Associate)</option>
                      <option value="Manager">Department Manager</option>
                      <option value="Administrator">Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1">Department</label>
                    <select
                      value={editingMember.department || 'General'}
                      onChange={(e) => setEditingMember({...editingMember, department: e.target.value})}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors cursor-pointer shadow-2xs"
                    >
                      <option value="General">General</option>
                      {departmentsList.map(d => (
                         <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1">Status</label>
                    <select
                      value={editingMember.status || 'Active'}
                      onChange={(e) => setEditingMember({...editingMember, status: e.target.value})}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors cursor-pointer shadow-2xs"
                    >
                      <option value="Active">Active</option>
                      <option value="Pending Invite">Pending Invite</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Compensation & Payroll */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4.5 sm:p-5 flex flex-col gap-3.5 shadow-2xs">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 text-slate-900 font-extrabold text-xs uppercase tracking-wider">
                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                  <span>2. Compensation & Payroll</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-slate-700 block mb-1">Monthly Salary / CTC</label>
                    <input 
                      type="text" 
                      placeholder="e.g. ₹50,000/mo"
                      value={editingMember.salary || ''}
                      onChange={(e) => setEditingMember({...editingMember, salary: e.target.value})}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors shadow-2xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1">UPI ID / VPA</label>
                    <input 
                      type="text" 
                      placeholder="e.g. rahul@okaxis"
                      value={editingMember.upi_id || ''}
                      onChange={(e) => setEditingMember({...editingMember, upi_id: e.target.value})}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors font-mono shadow-2xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-slate-700 block mb-1">Bank Account Number</label>
                    <input 
                      type="text" 
                      placeholder="Bank Account #"
                      value={editingMember.bank_account || ''}
                      onChange={(e) => setEditingMember({...editingMember, bank_account: e.target.value})}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors font-mono shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1">IFSC Code</label>
                    <input 
                      type="text" 
                      placeholder="IFSC Code"
                      value={editingMember.ifsc || ''}
                      onChange={(e) => setEditingMember({...editingMember, ifsc: e.target.value.toUpperCase()})}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 transition-colors font-mono uppercase shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Sticky Actions */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 -mx-6 -mb-6 mt-3">
                <button 
                  type="button" 
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Profile Updates</span>
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
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 text-center my-auto animate-modal-smooth">
             <div className="w-12 h-12 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-center mx-auto mb-3 text-rose-600 shadow-2xs">
                <Trash2 className="w-6 h-6" />
             </div>
             <h3 className="text-lg font-black text-slate-900 mb-1 font-outfit">Confirm Permanent Deletion</h3>
             <p className="text-xs text-slate-500 mb-5 font-medium leading-relaxed">Are you sure you want to permanently delete this member record?</p>
             <div className="flex items-center justify-center gap-2.5">
               <button onClick={() => setDeleteData(null)} className="flex-1 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Cancel</button>
               <button onClick={executeDelete} className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer">Confirm Delete</button>
             </div>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        AUTOMATIC REGISTRATION & CREDENTIALS CONFIRMATION MODAL
        ========================================================================
      */}
      {credentialsSuccessModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setCredentialsSuccessModal(null); }}
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black font-outfit text-slate-900">
                      Account Registered & Active
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                      Live
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Credentials successfully saved for <strong className="text-slate-800">{credentialsSuccessModal.name}</strong>
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setCredentialsSuccessModal(null)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 flex flex-col gap-4 bg-white text-slate-800 overflow-y-auto overscroll-contain chat-custom-scrollbar flex-1">
              
              {/* Email Dispatch & Ready Status */}
              <div className={`p-3.5 rounded-2xl border flex items-start gap-3 text-xs ${
                credentialsSuccessModal.emailDispatched 
                  ? 'bg-emerald-50 border-emerald-200' 
                  : 'bg-indigo-50/60 border-indigo-100'
              }`}>
                {credentialsSuccessModal.emailDispatched ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold text-slate-900">
                    {credentialsSuccessModal.emailDispatched 
                      ? '✓ Live Invitation Email Dispatched' 
                      : 'Account Active & Database Ready'}
                  </p>
                  <p className="text-slate-500 mt-0.5 leading-relaxed">
                    {credentialsSuccessModal.emailDispatched ? (
                      <span>Official invitation with temporary credentials was transmitted to <b className="text-slate-800">{credentialsSuccessModal.credentials.email}</b>.</span>
                    ) : (
                      <span>Credentials saved in database. Share the details below with <b className="text-slate-800">{credentialsSuccessModal.name}</b> or set SMTP in Settings for automatic Gmail delivery.</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Credentials Box */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-inner flex flex-col gap-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-sans font-bold">Designated Portal:</span>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold font-sans">
                    {credentialsSuccessModal.credentials.role === 'Manager' ? '👔 Manager Portal' : (credentialsSuccessModal.credentials.role === 'Administrator' ? '👑 Admin Portal' : '💼 Employee Portal')}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-slate-400 font-sans text-[11px]">Assigned Login Email:</span>
                  <div className="p-2.5 bg-black/50 rounded-xl border border-slate-800 text-teal-300 font-bold select-all flex items-center justify-between">
                    <span>{credentialsSuccessModal.credentials.email}</span>
                  </div>
                </div>

                {credentialsSuccessModal.credentials.id && (
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 font-sans text-[11px]">Employee Login ID (Alternative):</span>
                    <div className="p-2.5 bg-black/50 rounded-xl border border-slate-800 text-cyan-300 font-bold select-all flex items-center justify-between">
                      <span>{credentialsSuccessModal.credentials.id}</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <span className="text-slate-400 font-sans text-[11px]">Active Password:</span>
                  <div className="p-2.5 bg-black/50 rounded-xl border border-slate-800 text-amber-300 font-bold select-all flex items-center justify-between">
                    <span>{credentialsSuccessModal.credentials.password}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-slate-400 font-sans text-[11px]">Workspace Login URL:</span>
                  <div className="p-2.5 bg-black/50 rounded-xl border border-slate-800 text-slate-300 text-[11px] truncate">
                    {window.location.origin}
                  </div>
                </div>
                
                <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800">
                  💡 Team members can sign in using either their Email Address or their Employee ID.
                </div>
              </div>

              {/* Actions */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 border-t border-slate-100 flex items-center gap-3 shrink-0 -mx-6 -mb-6 mt-3">
                <button
                  type="button"
                  onClick={copyCredentialsToClipboard}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer ${
                    copiedStatus 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                  }`}
                >
                  {copiedStatus ? <Check className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
                  <span>{copiedStatus ? '✓ Copied Credentials!' : '📋 1-Click Copy Login Details'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCredentialsSuccessModal(null)}
                  className="py-2.5 px-5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        MEMBER TASK BREAKDOWN, TIMEFRAME AUDIT & PRINTABLE DOSSIER MODAL
        ========================================================================
      */}
      {selectedMemberForTasks && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedMemberForTasks(null); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md animate-fade-in"
        >
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-gray-200 animate-scale-up">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-gray-950 via-[#181c32] to-indigo-950 text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800">
              
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-teal-400 p-[1px] shadow-md flex-shrink-0">
                  <div className="w-full h-full bg-gray-900 rounded-2xl flex items-center justify-center font-black text-base text-teal-300 uppercase font-mono">
                    {selectedMemberForTasks.name ? selectedMemberForTasks.name.charAt(0) : selectedMemberForTasks.email.charAt(0)}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-black font-outfit text-white tracking-tight">
                      {selectedMemberForTasks.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                      {selectedMemberForTasks.role || 'Employee'}
                    </span>
                    {selectedMemberForTasks.department && (
                      <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold">
                        {selectedMemberForTasks.department}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 font-mono text-gray-300">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span>{selectedMemberForTasks.email}</span>
                    </span>
                    {selectedMemberForTasks.phone && (
                      <span className="flex items-center gap-1 font-mono text-gray-300">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span>{selectedMemberForTasks.phone}</span>
                      </span>
                    )}
                    {selectedMemberForTasks.salary && (
                      <span className="flex items-center gap-1 font-bold text-emerald-400">
                        <IndianRupee className="w-3.5 h-3.5" />
                        <span>{selectedMemberForTasks.salary}</span>
                      </span>
                    )}
                    {selectedMemberForTasks.date_of_joining && (
                      <span className="flex items-center gap-1 text-gray-300 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>Joined: {formatDate(selectedMemberForTasks.date_of_joining)}</span>
                      </span>
                    )}
                    {selectedMemberForTasks.pan && (
                      <span className="flex items-center gap-1 font-mono text-gray-300 text-[11px]">
                        <FileText className="w-3.5 h-3.5 text-gray-400" />
                        <span>PAN: {selectedMemberForTasks.pan}</span>
                      </span>
                    )}
                    {selectedMemberForTasks.upi_id && (
                      <span className="flex items-center gap-1 font-mono text-indigo-300 text-[11px]">
                        <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                        <span>UPI: {selectedMemberForTasks.upi_id}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Edit, Print & Close */}
              <div className="flex items-center gap-2.5 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => setEditingMember({ ...selectedMemberForTasks })}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
                  title="Edit member details"
                >
                  <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Edit Profile</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintMemberReport}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                  title="Print / Save PDF Report of Tasks"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Report</span>
                </button>

                <button 
                  type="button"
                  onClick={() => setSelectedMemberForTasks(null)} 
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer shadow-xs"
                  title="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

            </div>

            {/* Timeframe & Date Filter Ribbon */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col gap-3">
              
              {/* Row 1: Timeframe Type Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-2xs overflow-x-auto">
                  <span className="text-[10px] font-extrabold uppercase text-gray-400 px-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-indigo-500" /> Timeframe:
                  </span>
                  {[
                    { id: 'all', label: 'All Time' },
                    { id: 'day', label: 'Specific Day' },
                    { id: 'month', label: 'Specific Month' },
                    { id: 'year', label: 'Specific Year' },
                    { id: 'today', label: 'Today' },
                    { id: 'this_month', label: 'This Month' },
                    { id: 'this_year', label: 'This Year' }
                  ].map(tf => (
                    <button
                      key={tf.id}
                      type="button"
                      onClick={() => setTasksTimeframe(tf.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        tasksTimeframe === tf.id
                          ? 'bg-[#5b52e0] text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>

                {/* Date Input Pickers based on active timeframe */}
                <div className="flex items-center gap-2">
                  {tasksTimeframe === 'day' && (
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-gray-300 text-xs shadow-2xs">
                      <span className="font-bold text-gray-500 text-[11px]">Select Day:</span>
                      <input
                        type="date"
                        value={selectedDay}
                        onChange={(e) => setSelectedDay(e.target.value)}
                        className="font-bold text-gray-800 outline-none bg-transparent cursor-pointer"
                      />
                    </div>
                  )}

                  {tasksTimeframe === 'month' && (
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-gray-300 text-xs shadow-2xs">
                      <span className="font-bold text-gray-500 text-[11px]">Select Month:</span>
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="font-bold text-gray-800 outline-none bg-transparent cursor-pointer"
                      />
                    </div>
                  )}

                  {tasksTimeframe === 'year' && (
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-gray-300 text-xs shadow-2xs">
                      <span className="font-bold text-gray-500 text-[11px]">Select Year:</span>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="font-bold text-gray-800 outline-none bg-transparent cursor-pointer"
                      >
                        {['2027', '2026', '2025', '2024', '2023'].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

              </div>

              {/* Row 2: Status Tabs & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-200">
                
                {/* Status Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
                  {[
                    { id: 'all', label: 'All Tasks', count: filteredMemberTasks.length },
                    { id: 'in_progress', label: '⚡ In Progress', count: memberTasksAll.filter(t => t.status === 'In Progress').length },
                    { id: 'completed', label: '✅ Completed', count: memberTasksAll.filter(t => t.status === 'Completed').length },
                    { id: 'pending', label: '⏳ Pending', count: memberTasksAll.filter(t => t.status !== 'In Progress' && t.status !== 'Completed').length },
                    { id: 'overdue', label: '⚠️ Overdue', count: memberMetrics.overdue }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setTasksStatusFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        tasksStatusFilter === tab.id
                          ? 'bg-gray-900 text-white shadow-xs'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        tasksStatusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Search Box */}
                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search member tasks..."
                    value={tasksSearchQuery}
                    onChange={(e) => setTasksSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-gray-800"
                  />
                  {tasksSearchQuery && (
                    <button onClick={() => setTasksSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

              </div>

            </div>

            {/* Performance KPI Metrics Tiles */}
            <div className="p-4 bg-white border-b border-gray-100 grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Total Workload</span>
                <div className="text-xl font-black font-mono text-gray-900 mt-1">{memberMetrics.total}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Assigned Tasks</div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">In Progress</span>
                <div className="text-xl font-black font-mono text-blue-700 mt-1">{memberMetrics.inProgress}</div>
                <div className="text-[10px] text-blue-600/80 mt-0.5">Currently Working</div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Completed</span>
                <div className="text-xl font-black font-mono text-emerald-700 mt-1">{memberMetrics.completed}</div>
                <div className="text-[10px] text-emerald-600/80 mt-0.5">Finished Successfully</div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">Pending / Queued</span>
                <div className="text-xl font-black font-mono text-amber-800 mt-1">{memberMetrics.pending}</div>
                <div className="text-[10px] text-amber-700/80 mt-0.5">Awaiting Execution</div>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl col-span-2 sm:col-span-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">Completion Rate</span>
                <div className="text-xl font-black font-mono text-indigo-700 mt-1">{memberMetrics.rate}%</div>
                <div className="w-full bg-indigo-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${memberMetrics.rate}%` }} />
                </div>
              </div>
            </div>

            {/* Task Itemized Table & Audit List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f9fafb]">
              {filteredMemberTasks.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-xs space-y-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl mx-auto">
                    📋
                  </div>
                  <h4 className="text-base font-black text-gray-800 font-outfit">No tasks found for this period or filter</h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Try switching timeframe (e.g. All Time), clearing search terms, or toggling status tabs.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTasksTimeframe('all');
                      setTasksStatusFilter('all');
                      setTasksSearchQuery('');
                    }}
                    className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors cursor-pointer"
                  >
                    Reset Filter
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-wider">
                        <th className="p-3.5">Task & Deliverable</th>
                        <th className="p-3.5">Client / Project</th>
                        <th className="p-3.5">Category</th>
                        <th className="p-3.5">Due Date</th>
                        <th className="p-3.5">Priority</th>
                        <th className="p-3.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredMemberTasks.map((t) => {
                        const isDone = t.status === 'Completed';
                        const isInProg = t.status === 'In Progress';
                        const todayStr = new Date().toISOString().slice(0, 10);
                        const isOverdue = t.due_date && t.due_date < todayStr && !isDone;

                        return (
                          <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="p-3.5 font-semibold text-gray-900">
                              <div className="flex flex-col">
                                <span className={isDone ? 'line-through text-gray-400 font-medium' : 'text-gray-900 font-bold'}>
                                  {t.title}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono mt-0.5">{t.id}</span>
                                {t.notes && (
                                  <span className="text-[10px] text-gray-500 line-clamp-1 mt-0.5 italic">{t.notes}</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5 text-gray-700 font-medium">
                              <div className="flex flex-col">
                                <span>{t.client || 'Internal Practice'}</span>
                                {t.project && t.project !== 'None' && (
                                  <span className="text-[10px] text-purple-700 font-bold">Proj: {t.project}</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 border border-gray-200 text-[10px] font-bold">
                                {t.category || 'General'}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-gray-600">
                              <span className={`flex items-center gap-1 ${
                                isOverdue ? 'text-red-600 font-black' : 'text-gray-700 font-bold'
                              }`}>
                                <Calendar className="w-3 h-3 text-gray-400" />
                                {t.due_date || t.dueDate || 'No Deadline'}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                t.priority === 'Urgent' || t.priority === 'High'
                                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                  : t.priority === 'Medium'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}>
                                {t.priority || 'Normal'}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                isDone ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                isInProg ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                                isOverdue ? 'bg-red-100 text-red-800 border border-red-300' :
                                'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}>
                                {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                {isInProg && <Clock className="w-3 h-3 text-blue-600" />}
                                {isOverdue && <AlertCircle className="w-3 h-3 text-red-600" />}
                                {t.status || 'Pending'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer Bar with Quick Print Trigger */}
            <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-between text-xs">
              <div className="text-gray-500 font-medium">
                Showing <strong className="text-gray-900">{filteredMemberTasks.length}</strong> of <strong className="text-gray-900">{memberTasksAll.length}</strong> tasks • Timeframe: <strong className="text-indigo-600 uppercase">{tasksTimeframe.replace('_', ' ')}</strong>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrintMemberReport}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Dossier</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMemberForTasks(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* PERMANENT DELETION CONFIRMATION MODAL */}
      {deleteData && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteData(null); }}
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print-hidden"
        >
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 my-auto animate-modal-smooth text-slate-800">
            <div className="flex items-center gap-3.5 mb-4 border-b border-slate-100 pb-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shadow-2xs border border-rose-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 font-outfit">Permanently Delete Record?</h3>
                <p className="text-xs text-rose-600 font-semibold mt-0.5">
                  {deleteData.name ? `Account: ${deleteData.name}` : 'This action is irreversible'}
                </p>
              </div>
            </div>
            
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to permanently delete this member from your practice database and records? This will delete all associated login permissions and directory profiles.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteData(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Trash2 className="w-4 h-4" /> Yes, Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
