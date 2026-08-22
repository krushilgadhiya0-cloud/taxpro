import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Clock, 
  Bell, 
  ChevronRight, 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  UserCheck, 
  ListTodo, 
  Receipt, 
  UserPlus, 
  MessageSquare, 
  CalendarCheck, 
  Timer, 
  Settings, 
  FileText, 
  DollarSign,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  X,
  LogOut,
  Sparkles,
  Lightbulb,
  Building2,
  FolderKanban,
  Users2,
  Edit,
  Repeat,
  LifeBuoy,
  Key,
  Activity,
  Zap,
  Megaphone,
  RefreshCw,
  AlertCircle,
  Plus,
  Mic,
  Camera,
  Upload,
  Trash2
} from 'lucide-react';

import DashboardView from './DashboardView';
import TasksView from './pms/TasksView';
import ClientsView from './pms/ClientsView';
import ContactPersonView from './pms/ContactPersonView';
import ToDoView from './pms/ToDoView';
import ReceiptsPaymentsView from './pms/ReceiptsPaymentsView';
import CommunicationView from './pms/CommunicationView';
import AttendancePMSView from './pms/AttendancePMSView';
import TimeTrackingView from './pms/TimeTrackingView';
import SettingsPMSView from './pms/SettingsPMSView';
import ReportsPMSView from './pms/ReportsPMSView';
import FeesTrackingView from './pms/FeesTrackingView';
import IdeasView from './pms/IdeasView';
import DepartmentsView from './pms/DepartmentsView';
import ProjectsView from './pms/ProjectsView';
import TeamMembersView from './pms/TeamMembersView';
import WorkloadView from './pms/WorkloadView';
import OwnerPaymentsView from './pms/OwnerPaymentsView';
import PrivateChatView from './pms/PrivateChatView';
import IntegrationsView from './pms/IntegrationsView';
import SupportHelpView from './pms/SupportHelpView';
import MembersPaymentView from './pms/MembersPaymentView';
import OurPaymentView from './pms/OurPaymentView';
import AIInsightsBar from './AIInsightsBar';
import AIStudioPresenter from './pms/AIStudioPresenter';
import CalendarActivityModal from './pms/CalendarActivityModal';
import CalendarPageView from './pms/CalendarPageView';

const SCREEN_SLUG_MAP = {
  'dashboard': 'Dashboard',
  'calendar': 'Calendar',
  'timesheet': 'Calendar',
  'ai-studio': 'AI Studio',
  'ai-canvas': 'AI Studio',
  'presenter': 'AI Studio',
  'studio': 'AI Studio',
  'clients': 'Clients',
  'contact-person': 'Contact Person',
  'projects': 'Projects',
  'tasks': 'Tasks',
  'to-do': 'To Do',
  'todo': 'To Do',
  'workload': 'Workload',
  'team-members': 'Team Members',
  'departments': 'Departments',
  'fees-tracking': 'Fees Tracking',
  'receipts-payments': 'Receipts & Payments',
  'receipts': 'Receipts & Payments',
  'owner-payments': 'Owner Payments',
  'members-payment': 'Members Payment',
  'our-payment': 'Our Payment',
  'communication': 'Communication',
  'private-chat': 'Private Chat',
  'reports': 'Reports',
  'ideas': 'Ideas',
  'integrations': 'Integrations',
  'support-help': 'Support & Help',
  'settings': 'Settings'
};

const screenNameToSlug = (name) => {
  return (name || 'Dashboard')
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const resolveInitialScreen = () => {
  try {
    const hash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
    if (hash && SCREEN_SLUG_MAP[hash]) {
      return SCREEN_SLUG_MAP[hash];
    }
    const saved = localStorage.getItem('taxpro_active_nav');
    if (saved) return saved;
  } catch (e) {}
  return 'Dashboard';
};

export default function MainPMSShell({ userRole, onLogout, onShowToast, onTriggerAI }) {
  const [activeItem, setActiveItemState] = useState(() => resolveInitialScreen());
  const [userEmail, setUserEmail] = useState('');

  const navigateTo = (screenName, replace = false) => {
    if (!screenName) return;
    setActiveItemState(screenName);
    localStorage.setItem('taxpro_active_nav', screenName);
    const slug = screenNameToSlug(screenName);
    const targetHash = `#/${slug}`;

    if (replace) {
      window.history.replaceState({ screen: screenName }, '', targetHash);
    } else if (window.location.hash !== targetHash) {
      window.history.pushState({ screen: screenName }, '', targetHash);
    }

    window.dispatchEvent(new CustomEvent('taxpro_screen_changed', { detail: screenName }));
  };

  useEffect(() => {
    // Initial sync of hash
    const initialSlug = screenNameToSlug(activeItem);
    if (window.location.hash !== `#/${initialSlug}`) {
      window.history.replaceState({ screen: activeItem }, '', `#/${initialSlug}`);
    }

    // Chrome / Browser Back & Forward Navigation (PopState)
    const handlePopState = (e) => {
      let targetScreen = null;
      if (e.state && e.state.screen) {
        targetScreen = e.state.screen;
      } else {
        const hash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
        if (hash && SCREEN_SLUG_MAP[hash]) {
          targetScreen = SCREEN_SLUG_MAP[hash];
        } else {
          targetScreen = 'Dashboard';
        }
      }

      if (targetScreen) {
        setActiveItemState(targetScreen);
        localStorage.setItem('taxpro_active_nav', targetScreen);
        window.dispatchEvent(new CustomEvent('taxpro_screen_changed', { detail: targetScreen }));
      }
    };

    const handleAINavigate = (e) => {
      if (e.detail) {
        navigateTo(e.detail);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('ai_navigate', handleAINavigate);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('ai_navigate', handleAINavigate);
    };
  }, []);
  
  useEffect(() => {
    const loadUserIdentity = () => {
      const savedEmail = localStorage.getItem('taxpro_user_email') || localStorage.getItem('taxpro_secret_superadmin');
      if (savedEmail) {
         setUserEmail(savedEmail);
      } else {
         const sbToken = localStorage.getItem('sb-fkgjhlsqwypqgmjwvwlq-auth-token');
         if (sbToken) {
            try {
               const parsed = JSON.parse(sbToken);
               if (parsed?.user?.email) setUserEmail(parsed.user.email);
            } catch(e) {}
         }
      }
      
      const savedName = localStorage.getItem('taxpro_user_fullname');
      if (savedName) setUserFullName(savedName);
      
      const savedDept = localStorage.getItem('taxpro_user_department');
      if (savedDept) setUserDepartment(savedDept);
      
      const savedAvatar = localStorage.getItem('taxpro_user_avatar');
      if (savedAvatar) setUserAvatar(savedAvatar);
    };

    loadUserIdentity();

    const handleEmailChanged = (e) => {
      if (e.detail) setUserEmail(e.detail);
    };

    const handleProfileUpdated = (e) => {
      if (e.detail?.email) setUserEmail(e.detail.email);
      if (e.detail?.name) setUserFullName(e.detail.name);
    };

    window.addEventListener('taxpro_email_changed', handleEmailChanged);
    window.addEventListener('taxpro_profile_updated', handleProfileUpdated);

    return () => {
      window.removeEventListener('taxpro_email_changed', handleEmailChanged);
      window.removeEventListener('taxpro_profile_updated', handleProfileUpdated);
    };
  }, []);
  
  const [userAvatar, setUserAvatar] = useState(() => localStorage.getItem('taxpro_user_avatar') || '');
  const [userFullName, setUserFullName] = useState(() => localStorage.getItem('taxpro_user_fullname') || '');
  const [userDepartment, setUserDepartment] = useState(() => localStorage.getItem('taxpro_user_department') || '');

  const profileName = userFullName.trim() || (userEmail ? userEmail.split('@')[0].replace(/[^a-zA-Z]/g, ' ') : 'Administrator');
  const profileInitials = userFullName.trim()
    ? userFullName.trim().split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase()
    : (profileName.substring(0, 2).toUpperCase() || 'AD');

  const PRESET_AVATARS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  ];

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      if (onShowToast) onShowToast('Image too large. Please select a photo under 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 180;
        canvas.height = 180;
        ctx.drawImage(img, 0, 0, 180, 180);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        
        setUserAvatar(dataUrl);
        localStorage.setItem('taxpro_user_avatar', dataUrl);
        window.dispatchEvent(new CustomEvent('taxpro_avatar_changed', { detail: dataUrl }));
        if (onShowToast) onShowToast('Profile avatar updated successfully!', 'success');
      };
      img.src = readerEvent.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPresetAvatar = (presetUrl) => {
    setUserAvatar(presetUrl);
    localStorage.setItem('taxpro_user_avatar', presetUrl);
    window.dispatchEvent(new CustomEvent('taxpro_avatar_changed', { detail: presetUrl }));
    if (onShowToast) onShowToast('Preset avatar selected!', 'success');
  };

  const handleRemoveAvatar = () => {
    setUserAvatar('');
    localStorage.removeItem('taxpro_user_avatar');
    window.dispatchEvent(new CustomEvent('taxpro_avatar_changed', { detail: '' }));
    if (onShowToast) onShowToast('Avatar removed. Using initials.', 'info');
  };

  const [liveClock, setLiveClock] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState('All');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChatUser, setActiveChatUser] = useState(null);
  
  const [activeGlobalAlert, setActiveGlobalAlert] = useState(null);
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastText, setBroadcastText] = useState('');
  
  // Complaint Box State
  const [isComplainModalOpen, setIsComplainModalOpen] = useState(false);
  const [complainText, setComplainText] = useState('');
  const [isSubmittingComplain, setIsSubmittingComplain] = useState(false);

  // Screen Privacy Lock State
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [lockError, setLockError] = useState('');
  const [showUnlockPass, setShowUnlockPass] = useState(false);

  const handleUnlockScreen = (e) => {
    if (e) e.preventDefault();
    const savedPin = localStorage.getItem('taxpro_lock_pin') || '1234';
    const cleanInput = unlockPassword.trim();
    
    // Accept saved PIN, default '1234', 'admin', 'taxpro', or current user email
    if (
      cleanInput === savedPin || 
      cleanInput === '1234' || 
      cleanInput === 'admin' || 
      cleanInput === 'taxpro' || 
      (userEmail && cleanInput.toLowerCase() === userEmail.toLowerCase())
    ) {
      setIsScreenLocked(false);
      setUnlockPassword('');
      setLockError('');
      if (onShowToast) onShowToast('Workspace unlocked successfully.', 'success');
    } else {
      setLockError('Incorrect PIN / Password. Default PIN is 1234.');
    }
  };

  useEffect(() => {
    const dept = localStorage.getItem('taxpro_user_department');
    if (dept) setUserDepartment(dept);
  }, []);

  // Live Digital Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveClock(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts (Ctrl + K for Search, Ctrl + L for Screen Lock)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setIsScreenLocked(prev => !prev);
      }
    };
    const handleVoiceLock = () => {
      setIsScreenLocked(true);
      if (onShowToast) onShowToast('Voice Command: Screen Locked in Privacy Mode.', 'info');
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('taxpro_lock_screen', handleVoiceLock);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('taxpro_lock_screen', handleVoiceLock);
    };
  }, [onShowToast]);

  // Neural Voice AI Command Listeners
  useEffect(() => {
    const handleVoiceNav = (e) => {
      setActiveItem(e.detail);
      if (onShowToast) onShowToast(`Voice Command: Navigating to ${e.detail}`, 'success');
    };
    const handleVoiceSearch = (e) => {
      setIsSearchOpen(true);
      setSearchQuery(e.detail);
      if (onShowToast) onShowToast(`Voice Command: Searching for ${e.detail}`, 'success');
    };
    
    window.addEventListener('ai_navigate', handleVoiceNav);
    window.addEventListener('ai_search', handleVoiceSearch);
    
    return () => {
      window.removeEventListener('ai_navigate', handleVoiceNav);
      window.removeEventListener('ai_search', handleVoiceSearch);
    };
  }, [onShowToast]);

  const handleComplainSubmit = async () => {
    if (!complainText.trim()) return;
    setIsSubmittingComplain(true);
    
    try {
       const userEmail = localStorage.getItem('sb-fkgjhlsqwypqgmjwvwlq-auth-token') 
          ? JSON.parse(localStorage.getItem('sb-fkgjhlsqwypqgmjwvwlq-auth-token'))?.user?.email 
          : 'Anonymous';
       
       const baseUrl = window.location.origin;
       const res = await fetch(`${baseUrl}/api/complain`, {
          method: 'POST',
          headers:{'Content-Type': 'application/json'},
          body: JSON.stringify({
            reporterEmail: userEmail,
            reporterName: 'Authorized Employee',
            complaintText: complainText
          })
       });
       
       if (res.ok) {
         if (onShowToast) onShowToast('Complaint successfully transmitted to Super Admin.', 'success');
       } else {
         if (onShowToast) onShowToast('Failed to route complaint.', 'warning');
       }
    } catch(err) {
       if (onShowToast) onShowToast('Network error filing complaint.', 'error');
    }
    
    setIsSubmittingComplain(false);
    setIsComplainModalOpen(false);
    setComplainText('');
  };

  let sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, hasSub: false },
    { name: 'AI Studio', icon: Sparkles, hasSub: false },
    { name: 'Clients', icon: Users, hasSub: true },
    { name: 'Contact Person', icon: UserCheck, hasSub: true },
    { name: 'Projects', icon: FolderKanban, hasSub: false },
    { name: 'Tasks', icon: CheckSquare, hasSub: true },
    { name: 'To Do', icon: ListTodo, hasSub: true },
    { name: 'Workload', icon: Activity, hasSub: false },
    { name: 'Team Members', icon: Users2, hasSub: false },
    { name: 'Departments', icon: Building2, hasSub: false },
    { name: 'Fees Tracking', icon: DollarSign, hasSub: true },
    { name: 'Receipts & Payments', icon: Receipt, hasSub: true },
    { name: 'Owner Payments', icon: DollarSign, hasSub: true },
    { name: 'Members Payment', icon: DollarSign, hasSub: false },
    { name: 'Our Payment', icon: FileText, hasSub: false },
    { name: 'Communication', icon: MessageSquare, hasSub: true },
    { name: 'Private Chat', icon: MessageSquare, hasSub: false },
    { name: 'Reports', icon: FileText, hasSub: true },
    { name: 'Ideas', icon: Lightbulb, hasSub: false },
    { name: 'Integrations', icon: Zap, hasSub: false },
    { name: 'Calendar', icon: CalendarCheck, hasSub: false },
    { name: 'Support & Help', icon: LifeBuoy, hasSub: false },
    { name: 'Settings', icon: Settings, hasSub: true },
  ];

  // Dynamic Module Key Mapping
  const moduleKeyMap = {
    'Dashboard': 'dashboard',
    'Clients': 'clients',
    'Contact Person': 'clients',
    'Projects': 'projects',
    'Tasks': 'tasks',
    'To Do': 'todos',
    'Workload': 'workload',
    'Team Members': 'team_members',
    'Departments': 'departments',
    'Fees Tracking': 'fees_tracking',
    'Receipts & Payments': 'receipts_payments',
    'Owner Payments': 'owner_payments',
    'Members Payment': 'members_payment',
    'Our Payment': 'our_payment',
    'Communication': 'communication',
    'Private Chat': 'private_chat',
    'Reports': 'reports',
    'Ideas': 'ideas',
    'Integrations': 'integrations',
    'Support & Help': 'support',
    'Settings': 'settings'
  };

  let userPermissions = {};
  try {
    const rawPerms = localStorage.getItem('taxpro_user_permissions');
    if (rawPerms) userPermissions = JSON.parse(rawPerms);
  } catch (e) {}

  if (userRole !== 'Admin' && userRole !== 'Super Admin' && Object.keys(userPermissions).length > 0) {
    sidebarItems = sidebarItems.filter(item => {
      const key = moduleKeyMap[item.name] || item.name.toLowerCase();
      return userPermissions[key] !== false;
    });
  } else if (userRole === 'Employee') {
    sidebarItems = sidebarItems.filter(item => !['Integrations', 'Owner Payments', 'Receipts & Payments', 'Members Payment'].includes(item.name));
  } else if (userRole === 'Manager') {
    sidebarItems = sidebarItems.filter(item => !['Owner Payments', 'Integrations'].includes(item.name));
  } else {
    sidebarItems = sidebarItems.filter(item => !['Our Payment'].includes(item.name));
  }

  return (
    <div className="h-screen overflow-hidden bg-[#f3f4f6] text-gray-800 flex flex-col font-sans selection:bg-[#5b52e0] selection:text-white">
      
      {/* PMS WHITE TOP HEADER */}
      <header className="bg-white border-b border-gray-200 py-1.5 px-3 sm:px-5 flex items-center justify-between sticky top-0 z-40 shadow-2xs print:hidden h-12 transition-all duration-200">
        
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setActiveItem('Dashboard')}>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-yellow-400 via-blue-600 to-indigo-600 p-[1.5px] shadow-xs">
            <div className="w-full h-full bg-white rounded-[7px] flex items-center justify-center font-black text-[11px] text-[#5b52e0]">
              ❖
            </div>
          </div>
          <span className="font-extrabold text-base sm:text-lg text-[#1e1e2d] font-outfit tracking-tight">
            TAXPRO
          </span>
        </div>

        {/* Search Bar Group with Screen Lock Button on Left */}
        <div className="hidden md:flex items-center gap-2">
          {/* Privacy Screen Lock Button (Left of Search) */}
          <button 
            onClick={() => setIsScreenLocked(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-indigo-50 text-gray-700 hover:text-[#5b52e0] border border-gray-200 hover:border-indigo-200 transition-all shadow-2xs group cursor-pointer text-xs"
            title="Lock Workspace Privacy Mode (Ctrl + L)"
          >
            <Lock className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#5b52e0] group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold hidden lg:inline">Lock Screen</span>
          </button>

          {/* Global Search Bar (Ctrl + K) */}
          <div 
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 w-56 lg:w-72 xl:w-80 bg-[#f3f4f6] border border-gray-200 rounded-lg px-3 py-1 cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-400 font-medium flex-1 truncate">Search by Name, Trade Name or File No</span>
            <span className="text-[10px] text-gray-500 font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 shadow-2xs">Ctrl + K</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Live Date (Clickable -> Navigates to Calendar & Timesheet Page) */}
          <button 
            onClick={() => navigateTo('Calendar')}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-indigo-50 text-gray-700 hover:text-[#5b52e0] border border-gray-200 hover:border-indigo-200 transition-all text-xs font-mono font-bold cursor-pointer group shadow-2xs"
            title="Open Workforce Calendar & Timesheet Page"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#5b52e0] transition-colors" />
            <span className="text-[#5b52e0]">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </button>
          
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 border border-gray-200 text-xs font-mono font-bold text-gray-700">
            <Clock className="w-3 h-3 text-[#5b52e0]" />
            <span>{liveClock}</span>
          </div>

          {/* Quick Voice AI Mic Shortcut Button */}
          <button 
            onClick={() => {
              if (onTriggerAI) onTriggerAI();
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('taxpro_start_voice'));
              }, 150);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-purple-500/10 hover:from-cyan-500/20 hover:to-purple-500/20 text-cyan-800 border border-cyan-300/80 hover:border-cyan-400 transition-all shadow-xs group cursor-pointer"
            title="Launch Voice AI Assistant (Shortcut: Ctrl + M / Alt + M)"
          >
            <div className="w-4 h-4 rounded bg-cyan-600 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
              <Mic className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-xs font-bold text-gray-800 hidden md:inline">Voice AI</span>
            <span className="text-[10px] font-mono font-bold bg-white text-gray-500 px-1 py-0.2 rounded border border-gray-200 shadow-2xs hidden lg:inline">
              Ctrl+M
            </span>
          </button>

          {/* Global Broadcast Message System */}
          <button 
            onClick={() => setIsGlobalBroadcastOpen(true)}
            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors shadow-2xs cursor-pointer"
            title="Global Broadcast System"
          >
            <Megaphone className="w-3.5 h-3.5" />
          </button>
          
          {/* Complain / Feedback Box */}
          <button 
            onClick={() => setIsComplainModalOpen(true)}
            className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 transition-colors shadow-2xs cursor-pointer"
            title="Report a Complaint to Management"
          >
            <AlertCircle className="w-3.5 h-3.5" />
          </button>

          {/* Notifications Toggle */}
          <button 
            onClick={() => setIsNotificationsOpen(true)}
            className={`p-1.5 rounded-lg border transition-colors relative cursor-pointer ${isNotificationsOpen ? 'bg-gray-200 border-gray-300' : 'bg-gray-100 hover:bg-gray-200 border-gray-200'}`}
          >
            <Bell className="w-3.5 h-3.5 text-gray-600" />
            {activeGlobalAlert && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center shadow-sm animate-pulse">
                1
              </span>
            )}
          </button>

          {/* User Profile Badge & Popover */}
          <div className="relative pl-1.5 border-l border-gray-200">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 group cursor-pointer"
              title="User Profile & Settings"
            >
              {userAvatar ? (
                <img 
                  src={userAvatar} 
                  alt="Avatar" 
                  className="w-7 h-7 rounded-full object-cover shadow-xs ring-2 ring-indigo-300 group-hover:ring-indigo-500 transition-all" 
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-extrabold text-[11px] text-white shadow-sm ring-2 ring-white group-hover:ring-indigo-100 transition-all uppercase">
                  {profileInitials}
                </div>
              )}
            </button>

            {/* PROFILE POPOVER */}
            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
                <div className="absolute top-12 right-0 w-72 bg-white rounded-2xl shadow-xl border border-gray-200 p-2 z-50 animate-fade-in origin-top-right">
                  
                  {/* Header */}
                  <div className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-xl mb-2">
                    {userAvatar ? (
                      <img 
                        src={userAvatar} 
                        alt="Avatar" 
                        className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-indigo-200" 
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-extrabold text-sm text-white shadow-sm uppercase">
                        {profileInitials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate capitalize">{profileName}</div>
                      <div className="text-xs text-gray-500 truncate">{userEmail || 'System Administrator'}</div>
                    </div>
                  </div>

                  {/* Top Level Item */}
                  <div className="flex items-center justify-between px-3 py-2 mb-2 border border-gray-100 rounded-xl bg-gray-50/50">
                    <div className="flex items-center gap-3 min-w-0">
                      {userAvatar ? (
                        <img 
                          src={userAvatar} 
                          alt="Avatar" 
                          className="w-7 h-7 rounded-full object-cover shadow-2xs" 
                        />
                      ) : (
                        <div className="w-7 h-7 rounded bg-[#0f766e] flex items-center justify-center text-white font-bold text-xs uppercase shrink-0">
                          {profileInitials[0] || 'A'}
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-700 capitalize truncate">{profileName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end pl-2 shrink-0">
                       <span className={`px-2 py-1 text-[10px] font-bold rounded-lg leading-none ${userRole === 'Super Admin' ? 'bg-purple-100 text-purple-700 shadow-sm border border-purple-200/50' : 'bg-[#d1fae5] text-[#0f766e]'}`}>
                         {userRole || 'Admin'}
                       </span>
                       {userDepartment && (
                         <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg leading-none truncate max-w-[100px]">
                           {userDepartment}
                         </span>
                       )}
                    </div>
                  </div>

                  <div className="h-px bg-gray-100 my-2"></div>

                  <div className="flex flex-col gap-1">
                    <button onClick={() => { setIsProfileOpen(false); setIsEditProfileModalOpen(true); }} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors w-full text-left">
                      <Edit className="w-4 h-4 text-gray-400" />
                      <span>Edit Profile</span>
                    </button>
                    
                    <a 
                      href="https://wa.me/919327397851" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2 text-sm text-[#0f766e] hover:bg-teal-50 rounded-xl transition-colors w-full text-left font-medium"
                    >
                      <LifeBuoy className="w-4 h-4 text-[#0f766e]" />
                      <span>Support Chat (WhatsApp)</span>
                    </a>
                  </div>

                  <div className="h-px bg-gray-100 my-2"></div>

                  <div className="px-3 py-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 mb-2">
                      <Key className="w-3.5 h-3.5" /> API Token
                    </div>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-xl p-1.5 bg-gray-50">
                      <code className="text-[10px] text-gray-500 font-mono truncate px-1">eyJhbgGciOiJIUzI1NiIs...</code>
                      <button className="flex items-center gap-1.5 bg-[#0f766e] text-white px-2 py-1.5 rounded-lg text-xs font-bold hover:bg-teal-700 transition-colors">
                        <span className="opacity-80">📄</span> Copy
                      </button>
                    </div>
                  </div>

                  <div className="h-px bg-gray-100 my-2"></div>

                  <button 
                    onClick={onLogout}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors w-full text-left font-semibold"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>

                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        
        {/* LEFT NAVY SIDEBAR (Hover to expand) */}
        <aside className="group w-16 hover:w-64 bg-[#181c32] text-gray-300 flex flex-col py-4 px-3 flex-shrink-0 h-full overflow-y-auto overflow-x-hidden transition-all duration-300 z-30 relative custom-scrollbar-hide print:hidden">
          <div className="flex flex-col gap-1 w-56">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => navigateTo(item.name)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive 
                      ? 'bg-[#5b52e0] text-white shadow-lg shadow-[#5b52e0]/30 font-bold' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                  title={item.name}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    <span className="opacity-0 translate-x-4 invisible group-hover:visible group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap">
                      {item.name}
                    </span>
                  </div>
                  {item.hasSub && (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden group-hover:block" />
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* ACTIVE MODULE VIEW ROUTER */}
        <main className="flex-1 overflow-y-auto bg-[#f3f4f6] min-w-0">
          {activeItem === 'Dashboard' && (
            <AIInsightsBar 
              onTriggerBriefing={() => {
                if (onTriggerAI) onTriggerAI();
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('ai_briefing'));
                }, 150);
              }} 
              onNavigate={(target) => navigateTo(target)} 
            />
          )}
          <div className={activeItem === 'Dashboard' ? 'block animate-page-fade' : 'hidden'}><DashboardView onShowToast={onShowToast} onTriggerAI={onTriggerAI} /></div>
          <div className={activeItem === 'Calendar' ? 'block animate-page-fade' : 'hidden'}><CalendarPageView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'AI Studio' ? 'block animate-page-fade' : 'hidden'}><AIStudioPresenter onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Projects' ? 'block animate-page-fade' : 'hidden'}><ProjectsView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Workload' ? 'block animate-page-fade' : 'hidden'}>
            <WorkloadView 
              onShowToast={onShowToast} 
              onNavigateToPrivateChat={(user) => {
                setActiveChatUser(user);
                navigateTo('Private Chat');
              }} 
            />
          </div>
          <div className={activeItem === 'Team Members' ? 'block animate-page-fade' : 'hidden'}><TeamMembersView userRole={userRole} onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Departments' ? 'block animate-page-fade' : 'hidden'}><DepartmentsView userRole={userRole} onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Ideas' ? 'block animate-page-fade' : 'hidden'}><IdeasView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Tasks' ? 'block animate-page-fade' : 'hidden'}><TasksView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Clients' ? 'block animate-page-fade' : 'hidden'}><ClientsView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Contact Person' ? 'block animate-page-fade' : 'hidden'}><ContactPersonView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'To Do' ? 'block animate-page-fade' : 'hidden'}><ToDoView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Receipts & Payments' ? 'block animate-page-fade' : 'hidden'}><ReceiptsPaymentsView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Communication' ? 'block animate-page-fade' : 'hidden'}><CommunicationView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Private Chat' ? 'block animate-page-fade' : 'hidden'}><PrivateChatView onShowToast={onShowToast} preSelectedUser={activeChatUser} /></div>
          <div className={activeItem === 'Owner Payments' ? 'block animate-page-fade' : 'hidden'}><OwnerPaymentsView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Members Payment' ? 'block animate-page-fade' : 'hidden'}><MembersPaymentView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Our Payment' ? 'block animate-page-fade' : 'hidden'}><OurPaymentView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Fees Tracking' ? 'block animate-page-fade' : 'hidden'}><FeesTrackingView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Integrations' ? 'block animate-page-fade' : 'hidden'}><IntegrationsView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Reports' ? 'block animate-page-fade' : 'hidden'}><ReportsPMSView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Support & Help' ? 'block animate-page-fade' : 'hidden'}><SupportHelpView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Settings' ? 'block animate-page-fade' : 'hidden'}><SettingsPMSView onShowToast={onShowToast} /></div>
        </main>
      </div>

      {/* COMPREHENSIVE NOTIFICATIONS SLIDE-OVER DRAWER */}
      {isNotificationsOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsNotificationsOpen(false)}></div>
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col transform transition-transform animate-slide-in-right border-l border-gray-200">
            
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-lg font-outfit leading-tight">Notifications</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Activities & Alerts</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors uppercase tracking-wider">
                  Mark all read
                </button>
                <button onClick={() => setIsNotificationsOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification Tabs */}
            <div className="flex p-2 bg-gray-50/50 border-b border-gray-100 gap-1">
               {['All', 'Unread', 'Mentions', 'System'].map(t => (
                 <button 
                   key={t}
                   onClick={() => setNotificationTab(t)}
                   className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                     notificationTab === t ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                   }`}
                 >
                   {t}
                 </button>
               ))}
            </div>

            {/* Notifications Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
              
              {/* Special Global Alert in Feed */}
              {activeGlobalAlert && (notificationTab === 'All' || notificationTab === 'System') && (
                <div className="p-0.5 rounded-2xl bg-gradient-to-r from-red-500 via-orange-500 to-red-500 shadow-md">
                  <div className="p-4 bg-white rounded-xl shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600"></div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-red-600 shrink-0 flex items-center justify-center text-white font-bold shadow-md shadow-red-500/30">
                        <Megaphone className="w-5 h-5 animate-bounce" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 font-black uppercase tracking-wide truncate">
                          {activeGlobalAlert.subject}
                        </p>
                        <p className="text-xs text-red-600 font-bold mt-1 line-clamp-2">
                          {activeGlobalAlert.message}
                        </p>
                        <p className="text-[10px] text-gray-400 font-semibold mt-2">{activeGlobalAlert.time}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!activeGlobalAlert && (
                 <div className="p-8 mt-4 text-center bg-transparent border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center opacity-70">
                   <Bell className="w-8 h-8 text-gray-300 mb-2" />
                   <h4 className="text-sm font-extrabold text-gray-800">You're all caught up!</h4>
                   <p className="text-xs text-gray-500 font-semibold mt-1">No recent notifications matching this filter.</p>
                 </div>
              )}
              
              <div className="pt-4 text-center">
                <button className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">
                  View Older Notifications
                </button>
              </div>

            </div>
          </div>
        </>
      )}

      {/* SEARCH MODAL (Ctrl + K) */}
      {isSearchOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsSearchOpen(false); }}
          className="modal-overlay-backdrop z-[99999]"
        >
          <div className="modal-content-box max-w-xl p-4 relative">
            <button onClick={() => setIsSearchOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-100 pb-3 mb-3">
              <Search className="w-5 h-5 text-[#5b52e0]" />
              <input 
                type="text"
                placeholder="Type client name, trade name, task or file number..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full text-sm outline-none text-gray-800"
              />
            </div>

            <div className="text-xs text-gray-400 font-semibold px-2 py-1">Quick Suggestions</div>
            <div className="flex flex-col gap-1 text-xs">
              <div className="p-4 text-center text-gray-400 italic font-medium">Empty records</div>
            </div>
          </div>
        </div>
      )}


      {/* GLOBAL BROADCAST MODAL */}
      {isBroadcastModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsBroadcastModalOpen(false); }}
          className="modal-overlay-backdrop z-[99999]"
        >
          <div className="modal-content-box max-w-lg p-6 md:p-8 relative">
            <button onClick={() => setIsBroadcastModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2">
               <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                 <Megaphone className="w-5 h-5" />
               </div>
               <div>
                 <h3 className="text-xl font-extrabold font-outfit text-gray-900">Global Alert Broadcast</h3>
                 <p className="text-xs text-gray-500 font-medium">Disperse urgent messages across the firm.</p>
               </div>
            </div>
            
            <div className="flex flex-col gap-4 mt-6">
               <div>
                 <label className="text-xs font-bold text-gray-700 mb-1 block">Alert Subject</label>
                 <input 
                   type="text" 
                   value={broadcastSubject}
                   onChange={(e) => setBroadcastSubject(e.target.value)}
                   placeholder="e.g., URGENT: Server Maintenance at 5 PM" 
                   className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-500 text-sm" 
                 />
               </div>
               <div>
                 <label className="text-xs font-bold text-gray-700 mb-1 block">Alert Message</label>
                 <textarea 
                   rows="3" 
                   value={broadcastText}
                   onChange={(e) => setBroadcastText(e.target.value)}
                   placeholder="Type your broadcast message..." 
                   className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-500 text-sm resize-none"
                 ></textarea>
               </div>

               <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
                  <div className="text-xs font-bold text-gray-900 mb-2 border-b border-gray-200 pb-2">Target Audience (In-App)</div>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-3.5 h-3.5 accent-red-600" /> Send to all Team Members
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                    <input type="checkbox" className="w-3.5 h-3.5 accent-red-600" /> Send to all Clients
                  </label>
               </div>

               <div className="p-4 rounded-xl border border-gray-200 bg-[#1e1e2d] text-white space-y-3 shadow-inner">
                  <div className="text-xs font-bold text-gray-300 mb-2 border-b border-gray-700 pb-2 flex items-center justify-between">
                     External Dispatch Paths 
                     <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Integrations Active</span>
                  </div>
                  <label className="flex items-center justify-between text-xs font-medium cursor-pointer">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Push via WhatsApp API</div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-green-500" /> 
                  </label>
                  <label className="flex items-center justify-between text-xs font-medium cursor-pointer">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Send Bulk Emails</div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-500" /> 
                  </label>
               </div>
            </div>

            <button 
              onClick={() => {
                 setIsBroadcasting(true);
                 if(onShowToast) onShowToast('Compiling global alert payload...', 'info');
                 setTimeout(() => {
                    setActiveGlobalAlert({
                      subject: broadcastSubject || 'URGENT: General Firm Alert',
                      message: broadcastText || 'Please check with administration for further details.',
                      time: 'Just now'
                    });
                    if(onShowToast) onShowToast('✓ Alert successfully broadcasted via App, Email, and WhatsApp!', 'success');
                    setIsBroadcasting(false);
                    setIsBroadcastModalOpen(false);
                    setBroadcastSubject('');
                    setBroadcastText('');
                 }, 2000);
              }}
              disabled={isBroadcasting}
              className={`w-full mt-6 py-3.5 rounded-2xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2 ${isBroadcasting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 shadow-md'}`}
            >
               {isBroadcasting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Megaphone className="w-4 h-4" />}
               {isBroadcasting ? 'Dispatching Signals...' : 'Confirm & Dispatch URGENT Alert'}
            </button>
          </div>
        </div>
      )}

      {/* FULL-SCREEN GLOBAL ALERT INTRUSIVE POPUP */}
      {activeGlobalAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-red-600 rounded-3xl max-w-lg w-full shadow-2xl relative overflow-hidden flex flex-col animate-shake">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-500 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-yellow-500 rounded-full blur-3xl opacity-30"></div>
            
            <div className="relative z-10 p-8 flex flex-col items-center text-center text-white">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-6 shadow-inner border border-white/30 backdrop-blur-sm">
                <Megaphone className="w-10 h-10 text-white animate-pulse" />
              </div>
              
              <h2 className="text-3xl font-black font-outfit uppercase tracking-widest mb-2 shadow-sm px-4">
                {activeGlobalAlert.subject}
              </h2>
              
              <p className="text-sm font-medium text-red-50 mb-8 max-w-sm">
                {activeGlobalAlert.message}
              </p>
              
              <button 
                onClick={() => {
                  setActiveGlobalAlert(null);
                  if (onShowToast) onShowToast('Alert acknowledged.', 'info');
                }}
                className="w-full py-4 bg-white text-red-600 font-extrabold uppercase tracking-widest text-sm rounded-2xl hover:bg-red-50 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
              >
                I have read this alert
              </button>
            </div>
          </div>
        </div>
      )}
      {/* EDIT PROFILE MODAL */}
      {isEditProfileModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsEditProfileModalOpen(false); }}
          className="modal-overlay-backdrop z-[99999]"
        >
          <div className="modal-content-box max-w-md overflow-hidden relative">
            {/* Premium Gradient Header */}
            <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-xs">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-white tracking-tight">
                    Edit Profile & Avatar
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Customize your display credentials & identity
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsEditProfileModalOpen(false)} 
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer shadow-xs"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[80vh] overflow-y-auto scrollbar-thin">
              <div className="flex flex-col gap-4 text-xs font-semibold">
                
                {/* Current Avatar & Actions */}
                <div className="flex items-center gap-4 p-3.5 bg-gray-50 border border-gray-200 rounded-2xl">
                  <div className="relative group shrink-0">
                    {userAvatar ? (
                      <img 
                        src={userAvatar} 
                        alt="Profile Avatar" 
                        className="w-14 h-14 rounded-full object-cover shadow-md ring-4 ring-indigo-100" 
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-extrabold text-lg text-white shadow-md ring-4 ring-indigo-100 uppercase">
                        {profileInitials}
                      </div>
                    )}
                    <label 
                      className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity"
                      title="Upload New Photo"
                    >
                      <Camera className="w-5 h-5" />
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleAvatarUpload} 
                      />
                    </label>
                  </div>

                  <div className="flex-1">
                    <div className="text-xs font-bold text-gray-800 mb-1">Profile Photo</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-white hover:bg-indigo-50 rounded-xl transition-colors border border-indigo-200 shadow-2xs cursor-pointer flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload</span>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*" 
                          onChange={handleAvatarUpload} 
                        />
                      </label>
                      {userAvatar && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="px-2.5 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-200 flex items-center gap-1 cursor-pointer"
                          title="Reset avatar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preset Avatars Selection */}
                <div>
                  <label className="text-gray-500 mb-1.5 block uppercase tracking-widest text-[10px]">Or Select a Preset Avatar</label>
                  <div className="grid grid-cols-6 gap-2">
                    {PRESET_AVATARS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPresetAvatar(preset)}
                        className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all p-0.5 hover:scale-105 cursor-pointer ${
                          userAvatar === preset ? 'border-indigo-600 ring-2 ring-indigo-400 shadow-sm' : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        <img src={preset} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover rounded-full" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Full Name Field */}
                <div>
                  <label className="text-gray-700 block mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={userFullName} 
                    onChange={(e) => setUserFullName(e.target.value)} 
                    className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 font-semibold text-gray-800" 
                    placeholder="e.g. Krushil Gadhiya" 
                  />
                </div>
                
                {/* Email Address (Read Only) */}
                <div>
                  <label className="text-gray-700 block mb-1">Email Address (Read Only)</label>
                  <input 
                    type="email" 
                    readOnly 
                    value={userEmail || "admin@taxpro.com"} 
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 outline-none bg-gray-100 text-gray-500 cursor-not-allowed font-medium font-mono" 
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="text-gray-700 block mb-1">Department / Role</label>
                  <input 
                    type="text" 
                    value={userDepartment} 
                    onChange={(e) => setUserDepartment(e.target.value)} 
                    className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 font-semibold text-gray-800" 
                    placeholder="e.g. Finance & Tax" 
                  />
                </div>
                
                <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 mt-2 -mx-6 -mb-6">
                  <button
                    type="button"
                    onClick={() => setIsEditProfileModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      localStorage.setItem('taxpro_user_fullname', userFullName);
                      localStorage.setItem('taxpro_user_department', userDepartment);
                      setIsEditProfileModalOpen(false);
                      if (onShowToast) onShowToast('Profile details & avatar saved successfully!', 'success');
                    }}
                    className="px-6 py-2.5 bg-[#0f766e] hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-700/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPLAINT BOX MODAL */}
      {isComplainModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsComplainModalOpen(false); }}
          className="modal-overlay-backdrop z-[100]"
        >
          <div className="modal-content-box max-w-md">
            {/* Premium Gradient Header */}
            <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-xs">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-white tracking-tight">
                    Register Complaint
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Direct confidential routing to Master Admin Mailbox
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsComplainModalOpen(false)} 
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer shadow-xs"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 bg-white flex flex-col gap-4 text-xs font-semibold">
              <label className="text-gray-700">Detailed Complaint / Grievance Statement <span className="text-red-500">*</span></label>
              <textarea
                value={complainText}
                onChange={e => setComplainText(e.target.value)}
                placeholder="Describe your issue, feedback, or grievance in detail..."
                className="w-full h-32 rounded-xl border border-gray-300 p-3 text-xs resize-none focus:outline-none focus:border-indigo-500 placeholder:text-gray-400 bg-gray-50 focus:bg-white"
              />
              
              <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 -mx-6 -mb-6 mt-2">
                <button 
                  onClick={() => setIsComplainModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleComplainSubmit}
                  disabled={isSubmittingComplain || !complainText.trim()}
                  className="px-6 py-2.5 bg-[#0f766e] hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-700/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingComplain ? 'Transmitting...' : 'Send Complaint'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN PRIVACY LOCK ZERO-LAG OVERLAY */}
      {isScreenLocked && (
        <div className="fixed inset-0 z-[99999] bg-[#090b14]/94 backdrop-blur-xs flex items-center justify-center p-4 select-none will-change-transform">
          <div className="bg-[#111424] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 max-w-sm sm:max-w-md w-full shadow-2xl shadow-black/80 flex flex-col items-center text-center relative animate-modal-smooth">
            
            {/* Top Glow Security Orb */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 p-[1.5px] shadow-lg shadow-cyan-500/20 mb-4">
              <div className="w-full h-full bg-[#0b0c16] rounded-2xl flex items-center justify-center">
                <Lock className="w-6 h-6 text-cyan-400" />
              </div>
            </div>

            <h3 className="text-xl font-extrabold text-white font-outfit tracking-tight mb-1">
              Workspace Locked
            </h3>
            <p className="text-xs text-gray-400 mb-5 font-medium">
              TaxPro PMS screen is secured. Enter your PIN or Password to unlock.
            </p>

            {/* Active User Badge */}
            <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-2.5 mb-5 flex items-center justify-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-indigo-600/40 border border-indigo-400/40 text-indigo-300 font-bold text-[10px] flex items-center justify-center font-mono">
                {(userEmail || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-mono text-gray-300 font-semibold truncate max-w-[220px]">
                {userEmail || 'Authenticated User'}
              </span>
            </div>

            {/* Password / PIN Unlock Form */}
            <form onSubmit={handleUnlockScreen} className="w-full flex flex-col gap-3.5">
              <div className="relative w-full">
                <input
                  type={showUnlockPass ? "text" : "password"}
                  autoFocus
                  placeholder="Enter PIN / Password"
                  value={unlockPassword}
                  onChange={(e) => {
                    setUnlockPassword(e.target.value);
                    setLockError('');
                  }}
                  className={`w-full px-4 py-3 bg-black/70 border rounded-2xl outline-none font-mono text-sm text-white placeholder-gray-500 text-center tracking-widest transition-all ${
                    lockError ? 'border-red-500 ring-2 ring-red-500/30 bg-red-950/20' : 'border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowUnlockPass(!showUnlockPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1 cursor-pointer"
                  title={showUnlockPass ? "Hide Password" : "Show Password"}
                >
                  {showUnlockPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {lockError && (
                <div className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 py-2 px-3 rounded-xl animate-shake">
                  {lockError}
                </div>
              )}

              {/* Quick Pin Keypad helper buttons */}
              <div className="grid grid-cols-3 gap-2 my-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setLockError('');
                      if (k === 'C') {
                        setUnlockPassword('');
                      } else if (k === '⌫') {
                        setUnlockPassword(prev => prev.slice(0, -1));
                      } else {
                        setUnlockPassword(prev => prev + k);
                      }
                    }}
                    className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-cyan-500/20 text-gray-200 hover:text-white font-mono font-bold text-sm border border-white/5 transition-colors cursor-pointer"
                  >
                    {k}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 active:scale-98 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 hover:shadow-cyan-600/50 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Unlock className="w-4 h-4" />
                <span>Unlock Workspace</span>
              </button>

              <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 px-1">
                <span>Default PIN: <strong className="text-cyan-400 font-mono">1234</strong></span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-gray-400 hover:text-red-400 transition-colors underline underline-offset-2 cursor-pointer"
                >
                  Logout
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* WORKFORCE CALENDAR & DAILY ACTIVITY TIMESHEET MODAL */}
      <CalendarActivityModal 
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        onShowToast={onShowToast}
      />
    </div>
  );
}
