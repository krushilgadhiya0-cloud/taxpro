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
  RefreshCw
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

export default function MainPMSShell({ onLogout, onTriggerAI, onShowToast }) {
  const [activeItem, setActiveItem] = useState('Dashboard');
  const [liveClock, setLiveClock] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChatUser, setActiveChatUser] = useState(null);
  
  const [userDepartment, setUserDepartment] = useState('');

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

  // Keyboard shortcut Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, hasSub: false },
    { name: 'Projects', icon: FolderKanban, hasSub: false },
    { name: 'Workload', icon: Activity, hasSub: false },
    { name: 'Team Members', icon: Users2, hasSub: false },
    { name: 'Departments', icon: Building2, hasSub: false },
    { name: 'Communication', icon: MessageSquare, hasSub: true },
    { name: 'Private Chat', icon: MessageSquare, hasSub: false },
    { name: 'Ideas', icon: Lightbulb, hasSub: false },
    { name: 'Tasks', icon: CheckSquare, hasSub: true },
    { name: 'Owner Payments', icon: DollarSign, hasSub: true },
    { name: 'Clients', icon: Users, hasSub: true },
    { name: 'Contact Person', icon: UserCheck, hasSub: true },
    { name: 'To Do', icon: ListTodo, hasSub: true },
    { name: 'Receipts & Payments', icon: Receipt, hasSub: true },
    { name: 'Fees Tracking', icon: DollarSign, hasSub: true },
    { name: 'Integrations', icon: Zap, hasSub: false },
    { name: 'Reports', icon: FileText, hasSub: true },
    { name: 'Support & Help', icon: LifeBuoy, hasSub: false },
    { name: 'Settings', icon: Settings, hasSub: true },
  ];

  return (
    <div className="h-screen overflow-hidden bg-[#f3f4f6] text-gray-800 flex flex-col font-sans selection:bg-[#5b52e0] selection:text-white">
      
      {/* PMS WHITE TOP HEADER */}
      <header className="bg-white border-b border-gray-200 py-2.5 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveItem('Dashboard')}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-blue-600 to-indigo-600 p-[1.5px] shadow-sm">
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center font-black text-xs text-[#5b52e0]">
              ❖
            </div>
          </div>
          <span className="font-extrabold text-xl text-[#1e1e2d] font-outfit tracking-tight flex items-center gap-1.5">
            TAXPRO PMS <Lock className="w-4 h-4 text-[#5b52e0]" />
          </span>
        </div>

        {/* Global Search Bar (Ctrl + K) */}
        <div 
          onClick={() => setIsSearchOpen(true)}
          className="hidden md:flex items-center gap-2 w-full max-w-md bg-[#f3f4f6] border border-gray-200 rounded-xl px-3.5 py-1.5 cursor-pointer hover:bg-gray-100 transition-colors"
        >
          <Search className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400 font-medium flex-1">Search by Name, Trade Name or File No</span>
          <span className="text-[10px] text-gray-500 font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 shadow-2xs">Ctrl + K</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Live Clock Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 border border-gray-200 text-xs font-mono font-bold text-gray-700">
            <Clock className="w-3.5 h-3.5 text-[#5b52e0]" />
            <span>{liveClock}</span>
          </div>

          <button 
            onClick={() => setIsWhatsNewOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-[#1e1e2d] hover:bg-black text-xs font-bold text-white shadow-sm transition-colors"
          >
            What's New
          </button>

          {/* New Broadcast Icon */}
          <button 
            onClick={() => setIsBroadcastModalOpen(true)}
            className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors shadow-sm"
            title="Global Broadcast System"
          >
            <Megaphone className="w-4 h-4" />
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={`p-2 rounded-xl border transition-colors relative ${isNotificationsOpen ? 'bg-gray-200 border-gray-300' : 'bg-gray-100 hover:bg-gray-200 border-gray-200'}`}
            >
              <Bell className="w-4 h-4 text-gray-600" />
              <span className="w-2 h-2 rounded-full bg-[#5b52e0] absolute top-1 right-1 animate-pulse"></span>
            </button>
            
            {isNotificationsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)}></div>
                <div className="absolute top-12 right-0 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 p-3 z-50 animate-fade-in origin-top-right">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h4 className="text-sm font-extrabold text-gray-900 font-outfit">Notifications</h4>
                    <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">0 New</span>
                  </div>
                  
                  <div className="flex flex-col gap-2 p-3 text-center text-xs text-gray-500 font-bold bg-gray-50 rounded-xl my-2">
                    No new notifications.
                  </div>
                  
                  <button className="w-full text-center text-xs font-bold text-[#5b52e0] mt-3 py-1 hover:underline">Mark all as read</button>
                </div>
              </>
            )}
          </div>

          {/* User Profile Badge & Popover */}
          <div className="relative pl-2 border-l border-gray-200">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-full bg-[#1e40af] flex items-center justify-center font-extrabold text-xs text-white shadow-sm ring-2 ring-white hover:ring-indigo-100 transition-all">
                KG
              </div>
            </button>

            {/* PROFILE POPOVER */}
            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
                <div className="absolute top-12 right-0 w-72 bg-white rounded-2xl shadow-xl border border-gray-200 p-2 z-50 animate-fade-in origin-top-right">
                  
                  {/* Header */}
                  <div className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-xl mb-2">
                    <div className="w-10 h-10 rounded-full bg-[#1e40af] flex items-center justify-center font-extrabold text-sm text-white shadow-sm">
                      KG
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">krushil gadhiya</div>
                      <div className="text-xs text-gray-500 truncate">krushilgadhiya138@gmail.com</div>
                    </div>
                  </div>

                  {/* Top Level Item */}
                  <div className="flex items-center justify-between px-3 py-2 mb-2 border border-gray-100 rounded-xl bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded bg-[#0f766e] flex items-center justify-center text-white font-bold text-xs">
                        K
                      </div>
                      <span className="text-sm font-medium text-gray-700">krushil</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end pl-2">
                       <span className="px-2 py-1 bg-[#d1fae5] text-[#0f766e] text-[10px] font-bold rounded-lg leading-none">
                         Admin
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
                    <button className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors w-full text-left">
                      <Edit className="w-4 h-4 text-gray-400" />
                      <span>Edit Profile</span>
                    </button>
                    
                    <button 
                      onClick={() => { setIsProfileOpen(false); setIsWorkspaceModalOpen(true); }}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors w-full text-left"
                    >
                      <Repeat className="w-4 h-4 text-gray-400" />
                      <span>Switch Workspace</span>
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
        <aside className="group w-16 hover:w-64 bg-[#181c32] text-gray-300 flex flex-col py-4 px-3 flex-shrink-0 h-full overflow-y-auto overflow-x-hidden transition-all duration-300 z-30 relative custom-scrollbar-hide">
          <div className="flex flex-col gap-1 w-56">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => setActiveItem(item.name)}
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
        <main className="flex-1 overflow-y-auto">
          <div className={activeItem === 'Dashboard' ? 'block' : 'hidden'}><DashboardView onShowToast={onShowToast} onTriggerAI={onTriggerAI} /></div>
          <div className={activeItem === 'Projects' ? 'block' : 'hidden'}><ProjectsView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Workload' ? 'block' : 'hidden'}>
            <WorkloadView 
              onShowToast={onShowToast} 
              onNavigateToPrivateChat={(user) => {
                setActiveChatUser(user);
                setActiveItem('Private Chat');
              }} 
            />
          </div>
          <div className={activeItem === 'Team Members' ? 'block' : 'hidden'}><TeamMembersView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Departments' ? 'block' : 'hidden'}><DepartmentsView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Ideas' ? 'block' : 'hidden'}><IdeasView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Tasks' ? 'block' : 'hidden'}><TasksView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Clients' ? 'block' : 'hidden'}><ClientsView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Contact Person' ? 'block' : 'hidden'}><ContactPersonView /></div>
          <div className={activeItem === 'To Do' ? 'block' : 'hidden'}><ToDoView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Receipts & Payments' ? 'block' : 'hidden'}><ReceiptsPaymentsView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Communication' ? 'block' : 'hidden'}><CommunicationView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Private Chat' ? 'block' : 'hidden'}><PrivateChatView onShowToast={onShowToast} preSelectedUser={activeChatUser} /></div>
          <div className={activeItem === 'Owner Payments' ? 'block' : 'hidden'}><OwnerPaymentsView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Fees Tracking' ? 'block' : 'hidden'}><FeesTrackingView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Integrations' ? 'block' : 'hidden'}><IntegrationsView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Reports' ? 'block' : 'hidden'}><ReportsPMSView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Support & Help' ? 'block' : 'hidden'}><SupportHelpView onShowToast={onShowToast} /></div>
          <div className={activeItem === 'Settings' ? 'block' : 'hidden'}><SettingsPMSView onShowToast={onShowToast} /></div>
        </main>
      </div>

      {/* SEARCH MODAL (Ctrl + K) */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-4 max-w-xl w-full border border-gray-200 shadow-2xl relative">
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

      {/* WHAT'S NEW RELEASE NOTES MODAL */}
      {isWhatsNewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-gray-200 shadow-2xl relative">
            <button onClick={() => setIsWhatsNewOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-[#5b52e0] font-bold text-sm mb-2">
              <Sparkles className="w-4 h-4" /> TaxPro PMS v3.4 Update Release
            </div>
            <h3 className="text-xl font-extrabold font-outfit text-gray-900 mb-2">What's New in TaxPro PMS</h3>
            <ul className="text-xs text-gray-600 flex flex-col gap-2 list-disc pl-4 mb-4">
              <li>Instant 1-Click GST 3B Data Auto-Reconciliation</li>
              <li>WhatsApp & SMS Bulk Reminders Dispatcher</li>
              <li>Biometric Staff & Visitor In/Out Register Integration</li>
              <li>Live Time Tracking stopwatch for client billable hours</li>
            </ul>
            <button onClick={() => setIsWhatsNewOpen(false)} className="w-full py-2 bg-[#5b52e0] text-white font-bold text-xs rounded-xl">
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* WORKSPACE SWITCHER MODAL */}
      {isWorkspaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-gray-200 shadow-2xl relative animate-fade-in">
            <button onClick={() => setIsWorkspaceModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold font-outfit text-gray-900 mb-1">Select Workspace</h3>
            <p className="text-xs text-gray-500 mb-6 font-medium">Switch administrative context between different firms or branches.</p>
            
            <div className="flex flex-col gap-3 mb-6">
               <div className="p-4 rounded-2xl border-2 border-[#5b52e0] bg-indigo-50/50 flex items-center justify-between cursor-pointer shadow-sm relative overflow-hidden">
                 <div className="absolute top-0 right-0 bg-[#5b52e0] text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-bl-[10px]">Active</div>
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 text-white flex items-center justify-center font-bold text-lg shadow-inner">
                     FA
                   </div>
                   <div>
                     <h4 className="font-extrabold text-[#1e1e2d] text-sm">Finexo Advisory</h4>
                     <p className="text-[10px] font-bold text-gray-500">Main Headquarters</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-gray-200 shadow-2xs">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] font-bold text-gray-600 uppercase">Connected</span>
                 </div>
               </div>

               <div 
                 onClick={() => {
                   onShowToast && onShowToast('Switching administrative connection to Nexus Legal... (Mock)', 'info');
                   setIsWorkspaceModalOpen(false);
                 }}
                 className="p-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-indigo-300 flex items-center justify-between cursor-pointer transition-all group shadow-xs"
               >
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-gray-800 text-white flex items-center justify-center font-bold text-lg shadow-inner group-hover:bg-[#5b52e0] transition-colors">
                     NL
                   </div>
                   <div>
                     <h4 className="font-extrabold text-[#1e1e2d] text-sm group-hover:text-[#5b52e0] transition-colors">Nexus Legal Partners</h4>
                     <p className="text-[10px] font-bold text-gray-500">Branch Office</p>
                   </div>
                 </div>
                 <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#5b52e0] transition-colors" />
               </div>
            </div>

            <button 
              onClick={() => {
                 onShowToast && onShowToast('Opening secure workspace configuration portal...', 'info');
                 setIsWorkspaceModalOpen(false);
              }}
              className="w-full py-3.5 border-2 border-dashed border-gray-300 rounded-2xl text-gray-700 hover:text-[#5b52e0] hover:border-[#5b52e0] hover:bg-indigo-50 font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 text-[#5b52e0]" /> Create New Workspace
            </button>
          </div>
        </div>
      )}

      {/* GLOBAL BROADCAST MODAL */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border border-gray-200 shadow-2xl relative animate-fade-in">
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
                 <input type="text" placeholder="e.g., URGENT: Server Maintenance at 5 PM" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-500 text-sm" />
               </div>
               <div>
                 <label className="text-xs font-bold text-gray-700 mb-1 block">Alert Message</label>
                 <textarea rows="3" placeholder="Type your broadcast message..." className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-500 text-sm resize-none"></textarea>
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
                    if(onShowToast) onShowToast('✓ Alert successfully broadcasted via App, Email, and WhatsApp!', 'success');
                    setIsBroadcasting(false);
                    setIsBroadcastModalOpen(false);
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

    </div>
  );
}
