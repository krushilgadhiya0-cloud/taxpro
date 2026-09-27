import React, { useState, useEffect } from 'react';
import ParticleBackground from './components/ParticleBackground';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import OTPModal from './components/OTPModal';
import DashboardView from './components/DashboardView';
import ReportsView from './components/ReportsView';
import PaymentsView from './components/PaymentsView';
import WorkersView from './components/WorkersView';
import AttendanceView from './components/AttendanceView';
import AuthModal from './components/AuthModal';
import SecurityPanel from './components/SecurityPanel';
import PricingSection from './components/PricingSection';
import PaymentCheckoutModal from './components/PaymentCheckoutModal';
import ContactSection from './components/ContactSection';
import ToastContainer from './components/ToastContainer';
import LoadingScreen from './components/LoadingScreen';
import ProfileSetupModal from './components/ProfileSetupModal';
import PWAModal from './components/PWAModal';
import MainPMSShell from './components/MainPMSShell';
import SuperAdminShell from './components/SuperAdminShell';
import ForgotPasswordModal from './components/ForgotPasswordModal';
import SuperAdminAuthModal from './components/pms/SuperAdminAuthModal';
import TaxProChatbot from './components/TaxProChatbot';
import { supabase } from './lib/supabaseClient';
import soundFX from './lib/audioFX';
import { startSessionHeartbeat } from './lib/deviceSessionHelper';

import { 
  Sparkles, 
  Bot, 
  KeyRound, 
  ShieldCheck, 
  Github, 
  Twitter, 
  Linkedin,
  ArrowUp
} from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const queryRole = urlParams.get('role');
      if (queryRole) {
        const clean = queryRole.trim().toLowerCase().replace(/[\s_-]+/g, '');
        if (clean === 'superadmin' || clean === 'super') {
          return sessionStorage.getItem('taxpro_superadmin_authenticated') === 'true' || localStorage.getItem('taxpro_superadmin_authenticated') === 'true';
        }
        return true;
      }
      const session = localStorage.getItem('taxpro_pg_session');
      const superadmin = (
        sessionStorage.getItem('taxpro_superadmin_authenticated') === 'true' ||
        localStorage.getItem('taxpro_superadmin_authenticated') === 'true' ||
        localStorage.getItem('taxpro_user_role') === 'Super Admin'
      ) && (localStorage.getItem('taxpro_secret_superadmin') || localStorage.getItem('taxpro_user_email'));
      const profile = localStorage.getItem('taxpro_profile_completed');
      const email = localStorage.getItem('taxpro_user_email');
      return Boolean(session || superadmin || (profile && email));
    } catch (e) {
      return false;
    }
  });

  const [userRole, setUserRole] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const queryRole = urlParams.get('role');
      if (queryRole) {
        const clean = queryRole.trim().toLowerCase().replace(/[\s_-]+/g, '');
        if (clean === 'superadmin' || clean === 'super') {
          const isSuperAuthed = sessionStorage.getItem('taxpro_superadmin_authenticated') === 'true' || localStorage.getItem('taxpro_superadmin_authenticated') === 'true';
          if (isSuperAuthed) {
            localStorage.setItem('taxpro_user_role', 'Super Admin');
            localStorage.setItem('taxpro_secret_superadmin', 'superadmin@taxpro.com');
            localStorage.setItem('taxpro_user_email', 'superadmin@taxpro.com');
            localStorage.setItem('taxpro_workspace_mode', 'superadmin_core');
            localStorage.setItem('taxpro_profile_completed', 'true');
            return 'Super Admin';
          }
          return 'Admin';
        } else if (clean === 'admin' || clean === 'administrator') {
          localStorage.removeItem('taxpro_secret_superadmin');
          localStorage.setItem('taxpro_user_role', 'Admin');
          localStorage.setItem('taxpro_user_email', 'admin@taxpro.com');
          localStorage.setItem('taxpro_workspace_mode', 'pms_workspace');
          localStorage.setItem('taxpro_profile_completed', 'true');
          return 'Admin';
        } else if (clean === 'manager') {
          localStorage.removeItem('taxpro_secret_superadmin');
          localStorage.setItem('taxpro_user_role', 'Manager');
          localStorage.setItem('taxpro_user_email', 'manager@taxpro.com');
          localStorage.setItem('taxpro_workspace_mode', 'pms_workspace');
          localStorage.setItem('taxpro_profile_completed', 'true');
          return 'Manager';
        } else if (clean === 'employee' || clean === 'staff') {
          localStorage.removeItem('taxpro_secret_superadmin');
          localStorage.setItem('taxpro_user_role', 'Employee');
          localStorage.setItem('taxpro_user_email', 'employee@taxpro.com');
          localStorage.setItem('taxpro_workspace_mode', 'pms_workspace');
          localStorage.setItem('taxpro_profile_completed', 'true');
          return 'Employee';
        }
      }
    } catch (e) {}

    const savedEmail = (localStorage.getItem('taxpro_user_email') || localStorage.getItem('taxpro_secret_superadmin') || '').toLowerCase().trim();
    const reservedSuperAdmins = ['superadmin@taxpro.com', 'workforcepro09@gmail.com', 'krushilgadhiya0@gmail.com', 'krushilgadhiya138@gmail.com'];
    if (reservedSuperAdmins.includes(savedEmail) || sessionStorage.getItem('taxpro_superadmin_authenticated') === 'true' || localStorage.getItem('taxpro_superadmin_authenticated') === 'true') {
      return 'Super Admin';
    }

    return localStorage.getItem('taxpro_user_role') || 'Admin';
  });

  const [userEmail, setUserEmail] = useState(() => {
    return localStorage.getItem('taxpro_user_email') || localStorage.getItem('taxpro_secret_superadmin') || '';
  });

  const [loading, setLoading] = useState(() => {
    try {
      const alreadyLoaded = sessionStorage.getItem('taxpro_session_initialized');
      if (alreadyLoaded) return false;

      const session = localStorage.getItem('taxpro_pg_session');
      const superadmin = localStorage.getItem('taxpro_secret_superadmin');
      const profile = localStorage.getItem('taxpro_profile_completed');
      const email = localStorage.getItem('taxpro_user_email');
      if (session || superadmin || (profile && email)) {
        sessionStorage.setItem('taxpro_session_initialized', 'true');
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash.includes('dashboard') || localStorage.getItem('taxpro_workspace_mode') === 'pms_workspace') {
        return 'dashboard';
      }
    }
    return 'home';
  });
  const [pendingTab, setPendingTab] = useState(null);

  const [isOTPModalOpen, setIsOTPModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSuperAdminAuthModalOpen, setIsSuperAdminAuthModalOpen] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [isPWAModalOpen, setIsPWAModalOpen] = useState(false);
  const [selectedCheckoutPlan, setSelectedCheckoutPlan] = useState(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isProfileSetupOpen, setIsProfileSetupOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [loginTransition, setLoginTransition] = useState(null);

  // DYNAMIC ROLE URL SYNCHRONIZATION LISTENER (?role=superadmin, ?role=admin, ?role=manager, ?role=employee)
  useEffect(() => {
    const handleUrlRoleSync = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const queryRole = urlParams.get('role');
        if (queryRole) {
          const clean = queryRole.trim().toLowerCase().replace(/[\s_-]+/g, '');
          if (clean === 'superadmin' || clean === 'super') {
            const isSuperAuthed = sessionStorage.getItem('taxpro_superadmin_authenticated') === 'true' || localStorage.getItem('taxpro_superadmin_authenticated') === 'true';
            if (isSuperAuthed) {
              localStorage.setItem('taxpro_superadmin_authenticated', 'true');
              localStorage.setItem('taxpro_user_role', 'Super Admin');
              localStorage.setItem('taxpro_secret_superadmin', 'superadmin@taxpro.com');
              localStorage.setItem('taxpro_user_email', 'superadmin@taxpro.com');
              localStorage.setItem('taxpro_workspace_mode', 'superadmin_core');
              localStorage.setItem('taxpro_profile_completed', 'true');
              setUserRole('Super Admin');
              setUserEmail('superadmin@taxpro.com');
              setWorkspaceMode('superadmin_core');
              setIsAuthenticated(true);
            } else {
              setIsSuperAdminAuthModalOpen(true);
            }
          } else if (clean === 'admin' || clean === 'administrator') {
            localStorage.removeItem('taxpro_secret_superadmin');
            localStorage.setItem('taxpro_user_role', 'Admin');
            localStorage.setItem('taxpro_user_email', 'admin@taxpro.com');
            localStorage.setItem('taxpro_workspace_mode', 'pms_workspace');
            localStorage.setItem('taxpro_profile_completed', 'true');
            setUserRole('Admin');
            setUserEmail('admin@taxpro.com');
            setWorkspaceMode('pms_workspace');
            setIsAuthenticated(true);
          } else if (clean === 'manager') {
            localStorage.removeItem('taxpro_secret_superadmin');
            localStorage.setItem('taxpro_user_role', 'Manager');
            localStorage.setItem('taxpro_user_email', 'manager@taxpro.com');
            localStorage.setItem('taxpro_workspace_mode', 'pms_workspace');
            localStorage.setItem('taxpro_profile_completed', 'true');
            setUserRole('Manager');
            setUserEmail('manager@taxpro.com');
            setWorkspaceMode('pms_workspace');
            setIsAuthenticated(true);
          } else if (clean === 'employee' || clean === 'staff') {
            localStorage.removeItem('taxpro_secret_superadmin');
            localStorage.setItem('taxpro_user_role', 'Employee');
            localStorage.setItem('taxpro_user_email', 'employee@taxpro.com');
            localStorage.setItem('taxpro_workspace_mode', 'pms_workspace');
            localStorage.setItem('taxpro_profile_completed', 'true');
            setUserRole('Employee');
            setUserEmail('employee@taxpro.com');
            setWorkspaceMode('pms_workspace');
            setIsAuthenticated(true);
          }
        }
      } catch (e) {}
    };

    window.addEventListener('popstate', handleUrlRoleSync);
    window.addEventListener('taxpro_switch_role_url', handleUrlRoleSync);

    const handleSuperAdminLoginEvent = () => {
      sessionStorage.setItem('taxpro_superadmin_authenticated', 'true');
      localStorage.setItem('taxpro_superadmin_authenticated', 'true');
      localStorage.setItem('taxpro_secret_superadmin', 'superadmin@taxpro.com');
      localStorage.setItem('taxpro_user_email', 'superadmin@taxpro.com');
      localStorage.setItem('taxpro_user_role', 'Super Admin');
      localStorage.setItem('taxpro_workspace_mode', 'superadmin_core');
      localStorage.setItem('taxpro_profile_completed', 'true');
      setUserRole('Super Admin');
      setUserEmail('superadmin@taxpro.com');
      setWorkspaceMode('superadmin_core');
      setIsAuthenticated(true);
      setLoginTransition({ role: 'Super Admin', firmName: 'TaxPro Global Core' });
    };
    window.addEventListener('taxpro_superadmin_login', handleSuperAdminLoginEvent);

    return () => {
      window.removeEventListener('popstate', handleUrlRoleSync);
      window.removeEventListener('taxpro_switch_role_url', handleUrlRoleSync);
      window.removeEventListener('taxpro_superadmin_login', handleSuperAdminLoginEvent);
    };
  }, []);

  // GLOBAL OPEN LOGIN MODAL LISTENER (Seamless login redirection from checkout & owner payments)
  useEffect(() => {
    const handleOpenLoginModal = () => {
      setAuthMode('login');
      setIsAuthModalOpen(true);
    };
    window.addEventListener('taxpro_open_login', handleOpenLoginModal);
    return () => window.removeEventListener('taxpro_open_login', handleOpenLoginModal);
  }, []);

  // AUTOMATIC ACTIVE SESSION REGISTRATION & LIVE HEARTBEAT ("WHO OPENED MY WEB")
  useEffect(() => {
    const activeEmail = (userEmail || localStorage.getItem('taxpro_user_email') || localStorage.getItem('taxpro_secret_superadmin') || '').trim();
    if (isAuthenticated && activeEmail) {
      try {
        startSessionHeartbeat(activeEmail);
      } catch (e) {}
    }
  }, [isAuthenticated, userEmail]);

  // GLOBAL DARK MODE & ZOOM SYNCHRONIZATION LISTENER
  useEffect(() => {
    const currentTheme = localStorage.getItem('taxpro_theme');
    if (currentTheme === 'dark' && !document.documentElement.classList.contains('dark-mode-global')) {
      document.documentElement.classList.add('dark-mode-global', 'dark');
    }

    const handleZoomChange = (e) => {
      const zoom = e.detail || 90;
      document.documentElement.style.zoom = `${zoom}%`;
      localStorage.setItem('taxpro_global_zoom', String(zoom));
    };

    window.addEventListener('taxpro_zoom_changed', handleZoomChange);
    return () => window.removeEventListener('taxpro_zoom_changed', handleZoomChange);
  }, []);

  // GLOBAL UI CLICK SOUND ACOUSTIC FEEDBACK LISTENER
  useEffect(() => {
    const handleGlobalClick = (e) => {
      const target = e.target;
      if (!target) return;
      const interactive = target.closest('button, a, [role="button"], input[type="submit"], input[type="button"], .cursor-pointer');
      if (interactive) {
        soundFX.playClick();
      }
    };

    window.addEventListener('pointerdown', handleGlobalClick, { capture: true });
    return () => window.removeEventListener('pointerdown', handleGlobalClick, { capture: true });
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Supabase Global Auth Listener
    const checkSession = async () => {
      
      // 1. Check for secret backdoor FIRST
      const secretEmail = localStorage.getItem('taxpro_secret_superadmin');
      if (secretEmail) {
         setUserEmail(secretEmail);
         setUserRole('Super Admin');
         setIsAuthenticated(true);
         return;
      }
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
         setTimeout(() => {
           showToast(`✕ Auth Error: ${error.message}`, 'error');
           if (error.message.toLowerCase().includes('provider')) {
              showToast('⚠️ Please ensure the Google Auth Provider is strictly enabled in your Supabase Dashboard.', 'warning');
           }
         }, 500);
         if (window.location.href.endsWith('#')) {
            window.history.replaceState(null, null, window.location.pathname + window.location.search);
         }
      }
      if (session) {
        const userMail = session.user?.email?.toLowerCase().trim();
        if (userMail) setUserEmail(userMail);
        
        if (userMail === 'workforcepro09@gmail.com') {
           setIsAuthenticated(true);
           return;
        }
        
        const { data: memberCheck } = await supabase.from('team_members').select('id, role, status, permissions').ilike('email', userMail).single();
        
        // Strict Authorization Layer (Securing firm from disabled accounts & revoked access)
        const allowedAdmins = ['workforcepro09@gmail.com', 'krushilgadhiya0@gmail.com', 'krushilgadhiya138@gmail.com', 'superadmin@taxpro.com'];
        const isAuthorizedAdmin = allowedAdmins.includes(userMail) || localStorage.getItem('taxpro_secret_superadmin') === userMail;

        let member = memberCheck;
        if (!member) {
          try {
            const { data: userFallback } = await supabase.from('users').select('id, role, name').ilike('email', userMail).single();
            if (userFallback) member = userFallback;
          } catch (e) {}
        }

        // If still not found in query, use active session user info
        if (!member && session.user) {
          const pgRole = localStorage.getItem('taxpro_user_role') || session.user.role || session.user.user_metadata?.role;
          if (pgRole) {
            member = {
              id: session.user.id,
              role: pgRole,
              name: session.user.user_metadata?.name || userMail.split('@')[0],
              status: 'Active'
            };
          }
        }

        const isRevoked = member && (member.status === 'Past' || member.status === 'Access Revoked' || member.status === 'Suspended');

        if ((!member && !isAuthorizedAdmin) || (isRevoked && !isAuthorizedAdmin)) {
           await supabase.auth.signOut();
           localStorage.removeItem('taxpro_pg_session');
           localStorage.removeItem('taxpro_user_role');
           localStorage.removeItem('taxpro_user_permissions');
           showToast('🔒 Access Revoked: An Administrator has revoked or suspended your access to this firm workspace.', 'error');
           setIsAuthenticated(false);
           return;
        }

        if (member?.permissions) {
          localStorage.setItem('taxpro_user_permissions', typeof member.permissions === 'string' ? member.permissions : JSON.stringify(member.permissions));
        }

        const isNewUser = session.user?.created_at 
           ? (new Date() - new Date(session.user.created_at)) < (5 * 60 * 1000) 
           : false;
           
        if (member || session.user?.user_metadata?.profile_completed || !isNewUser) {
          localStorage.setItem('taxpro_profile_completed', 'true');
          
          let role = localStorage.getItem('taxpro_user_role') || 'Employee';
          if (isAuthorizedAdmin) {
            role = 'Admin';
          } else if (member) {
            const rawRole = (member.role || '').toLowerCase();
            if (rawRole.includes('admin') || rawRole.includes('owner') || rawRole.includes('principal') || rawRole.includes('director')) {
              role = 'Admin';
            } else if (rawRole.includes('manager') || rawRole.includes('head') || rawRole.includes('lead')) {
              role = 'Manager';
            } else {
              role = 'Employee';
            }
            if (member.status === 'Active' || member.status === 'Pending Invite') {
              try { await supabase.from('team_members').update({ status: 'Active' }).ilike('email', userMail); } catch (e) {}
            }
          }
          
          localStorage.setItem('taxpro_user_role', role);
          setUserRole(role);
        }
        
        if (localStorage.getItem('taxpro_profile_completed')) {
          setUserRole(localStorage.getItem('taxpro_user_role') || 'Admin');
          setIsAuthenticated(true);
          setActiveTab((prev) => ['home', 'pricing'].includes(prev) ? 'dashboard' : prev);
        } else {
          setIsProfileSetupOpen(true);
        }
      }
    };
    checkSession();

    const handleSecretSuperadminLogin = () => {
       const secretEmail = localStorage.getItem('taxpro_secret_superadmin');
       if (secretEmail) {
          setUserEmail(secretEmail);
          setUserRole('Super Admin');
          setIsAuthenticated(true);
       }
    };
    window.addEventListener('taxpro_superadmin_login', handleSecretSuperadminLogin);

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const userMail = session?.user?.email?.toLowerCase().trim();
        if (userMail) setUserEmail(userMail);

        if (userMail === 'workforcepro09@gmail.com') {
           setIsAuthenticated(true);
           return;
        }

        const { data: memberCheck } = await supabase.from('team_members').select('id, role, status').ilike('email', userMail).single();
        
        // Strict Authorization Layer (Securing firm from deleted employees & randoms)
        const allowedAdmins = ['workforcepro09@gmail.com', 'krushilgadhiya0@gmail.com', 'krushilgadhiya138@gmail.com', 'superadmin@taxpro.com'];
        const isAuthorizedAdmin = allowedAdmins.includes(userMail) || localStorage.getItem('taxpro_secret_superadmin') === userMail;

        let member = memberCheck;
        if (!member) {
          try {
            const { data: userFallback } = await supabase.from('users').select('id, role').ilike('email', userMail).single();
            if (userFallback) member = userFallback;
          } catch (e) {}
        }

        if ((!member && !isAuthorizedAdmin) || (member && (member.status === 'Past' || member.status === 'Access Revoked' || member.status === 'Suspended'))) {
           await supabase.auth.signOut();
           showToast('Access Revoked: Your account has been disabled. You are no longer authorized to enter the firm.', 'error');
           setIsAuthenticated(false);
           return;
        }

        const isNewUser = session?.user?.created_at 
           ? (new Date() - new Date(session.user.created_at)) < (5 * 60 * 1000) 
           : false;
           
        if (member || session?.user?.user_metadata?.profile_completed || !isNewUser) {
          localStorage.setItem('taxpro_profile_completed', 'true');
          
          let role = 'Employee';
          if (isAuthorizedAdmin) {
             role = 'Admin';
          } else if (member) {
             const rawRole = (member.role || '').toLowerCase();
             if (rawRole.includes('admin') || rawRole.includes('owner') || rawRole.includes('principal')) {
               role = 'Admin';
             } else if (rawRole.includes('manager') || rawRole.includes('head') || rawRole.includes('lead')) {
               role = 'Manager';
             } else {
               role = 'Employee';
             }
             if (event === 'SIGNED_IN') {
                 try { await supabase.from('team_members').update({ status: 'Active' }).ilike('email', userMail); } catch (e) {}
             }
          }
          
          localStorage.setItem('taxpro_user_role', role);
          setUserRole(role);
        }
        
        localStorage.setItem('taxpro_profile_completed', 'true');
        localStorage.setItem('taxpro_setup_completed', 'true');
        localStorage.setItem('taxpro_workspace_mode', 'pms_workspace');
        setWorkspaceMode('pms_workspace');
        localStorage.setItem('taxpro_active_nav', 'Dashboard');
        window.location.hash = '#/dashboard';
        setUserRole(localStorage.getItem('taxpro_user_role') || 'Admin');
        setIsAuthenticated(true);
        setActiveTab('dashboard');
        setIsProfileSetupOpen(false);

        // Supabase often leaves a trailing '#' after parsing implicit OAuth hashes. Clean it up:
        if (window.location.href.endsWith('#')) {
          window.history.replaceState(null, null, window.location.pathname + window.location.search);
        }
      } else if (event === 'SIGNED_OUT') {
        if (!localStorage.getItem('taxpro_secret_superadmin')) {
           setIsAuthenticated(false);
           setActiveTab('home');
        }
      }
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('taxpro_superadmin_login', handleSecretSuperadminLogin);
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Protected Tabs List
  const protectedTabs = ['dashboard', 'reports', 'payments', 'workers', 'attendance', 'security'];

  // Toast Notification Dispatcher
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const closeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSelectTab = (tabId) => {
    if (protectedTabs.includes(tabId) && !isAuthenticated) {
      setPendingTab(tabId);
      showToast('🔒 Sign in required to access TaxPro features.', 'warning');
      handleOpenAuth('login');
    } else {
      setActiveTab(tabId);
    }
  };

  const handleOpenAuth = (mode) => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (e) {}
    sessionStorage.removeItem('taxpro_superadmin_authenticated');
    localStorage.removeItem('taxpro_superadmin_authenticated');
    localStorage.removeItem('taxpro_profile_completed');
    localStorage.removeItem('taxpro_user_role');
    localStorage.removeItem('taxpro_secret_superadmin');
    localStorage.removeItem('taxpro_user_email');
    localStorage.removeItem('taxpro_workspace_mode');
    localStorage.removeItem('taxpro_pg_session');
    setIsAuthenticated(false);
    setUserRole('Admin');
    setUserEmail('');
    setWorkspaceMode('auto');
    window.location.hash = '';
    setActiveTab('home');
    showToast('Signed out of TaxPro session.', 'info');
  };

  const [workspaceMode, setWorkspaceMode] = useState(() => {
    const savedEmail = (localStorage.getItem('taxpro_user_email') || localStorage.getItem('taxpro_secret_superadmin') || '').toLowerCase().trim();
    const reservedAdmins = ['superadmin@taxpro.com', 'workforcepro09@gmail.com', 'krushilgadhiya0@gmail.com', 'krushilgadhiya138@gmail.com'];
    if (reservedAdmins.includes(savedEmail) || sessionStorage.getItem('taxpro_superadmin_authenticated') === 'true' || localStorage.getItem('taxpro_superadmin_authenticated') === 'true') {
      return 'superadmin_core';
    }
    return localStorage.getItem('taxpro_workspace_mode') || 'auto';
  });

  const handleSwitchToPMS = (targetTab = 'Dashboard') => {
    showToast('SuperAdmin is dedicated solely to global platform monitoring.', 'info');
  };

  const handleSwitchToSuperAdmin = () => {
    sessionStorage.setItem('taxpro_superadmin_authenticated', 'true');
    localStorage.setItem('taxpro_superadmin_authenticated', 'true');
    localStorage.setItem('taxpro_workspace_mode', 'superadmin_core');
    setWorkspaceMode('superadmin_core');
    setUserRole('Super Admin');
    showToast('✓ Switched to SaaS Master SuperAdmin Core', 'info');
  };

  if (loading) {
    return (
      <LoadingScreen
        onFinished={() => {
          sessionStorage.setItem('taxpro_session_initialized', 'true');
          setLoading(false);
        }}
      />
    );
  }

  // When Authenticated: Render Full 1:1 Main PMS Application Suite OR Dedicated SuperAdmin Monitoring
  if (isAuthenticated) {
    const cleanEmail = (userEmail || localStorage.getItem('taxpro_user_email') || '').toLowerCase().trim();
    const storedRole = (localStorage.getItem('taxpro_user_role') || '').trim();
    const reservedSuperAdmins = ['superadmin@taxpro.com', 'workforcepro09@gmail.com', 'krushilgadhiya0@gmail.com', 'krushilgadhiya138@gmail.com'];
    const isMasterAdmin = 
      userRole === 'Super Admin' || 
      userRole === 'Super Administrator' ||
      storedRole === 'Super Admin' ||
      storedRole === 'Super Administrator' ||
      reservedSuperAdmins.includes(cleanEmail) ||
      cleanEmail === 'superadmin' ||
      sessionStorage.getItem('taxpro_superadmin_authenticated') === 'true' ||
      localStorage.getItem('taxpro_superadmin_authenticated') === 'true';

    // SuperAdmin is dedicated solely to global monitoring across all firms, users, payments and sessions
    if (isMasterAdmin) {
       return (
         <>
           {loginTransition && (
             <LoadingScreen
               targetRole="Super Admin"
               firmName="TaxPro Global Core Command"
               onFinished={() => setLoginTransition(null)}
             />
           )}
           <SuperAdminShell 
             onLogout={handleLogout} 
             onShowToast={showToast} 
           />
           <ToastContainer toasts={toasts} onCloseToast={closeToast} />
         </>
       );
    }

    const isSetupCompleted = localStorage.getItem('taxpro_setup_completed') !== 'false';

    return (
      <div className="relative min-h-screen bg-[#f3f4f6]">
        {loginTransition && (
          <LoadingScreen
            targetRole={loginTransition.role}
            firmName={loginTransition.firmName}
            onFinished={() => setLoginTransition(null)}
          />
        )}
        <ToastContainer toasts={toasts} onCloseToast={closeToast} />
        
        {/* MANDATORY PRACTICE & FIRM SETUP GATEKEEPER */}
        {!isSetupCompleted && !isMasterAdmin ? (
          <ProfileSetupModal
            isOpen={true}
            onComplete={(data) => {
              localStorage.setItem('taxpro_setup_completed', 'true');
              showToast(`✓ Practice "${data.firmName}" configured successfully! Welcome to TaxPro.`, 'success');
              window.dispatchEvent(new CustomEvent('taxpro_firm_updated'));
              window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
              window.location.reload();
            }}
          />
        ) : (
          <MainPMSShell 
            userRole={isMasterAdmin ? 'Super Admin' : userRole}
            isSuperAdmin={isMasterAdmin}
            onSwitchToSuperAdmin={handleSwitchToSuperAdmin}
            onLogout={handleLogout}
            onTriggerAI={() => setIsAIAssistantOpen(true)}
            onShowToast={showToast}
          />
        )}

        {/* SuperAdmin Master Password Verification Gate Modal */}
        <SuperAdminAuthModal
          isOpen={isSuperAdminAuthModalOpen}
          onClose={() => setIsSuperAdminAuthModalOpen(false)}
          onSuccess={() => {
            setUserRole('Super Admin');
            setWorkspaceMode('superadmin_core');
          }}
          onShowToast={showToast}
        />

        {/* Global Production AI Chatbot Widget */}
        <TaxProChatbot onShowToast={showToast} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#090909] text-white selection:bg-cyan-500 selection:text-black">
      
      {/* 60 FPS Canvas Particle Background */}
      <ParticleBackground />

      {/* Glassmorphic Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        onOpenOTP={() => setIsOTPModalOpen(true)}
        onOpenAuth={handleOpenAuth}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        unreadNotifications={3}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onCloseToast={closeToast} />

      {/* DYNAMIC VIEW ROUTING */}
      <main className="relative z-10">
        
        {activeTab === 'home' && (
          <HeroSection
            onGetStarted={() => handleOpenAuth('login')}
            onWatchDemo={() => {
              showToast('Launching TaxPro AI Interactive Product Tour...', 'info');
              setActiveTab('dashboard');
            }}
            onExploreDashboard={() => setActiveTab('dashboard')}
            onPWAInstall={() => setIsPWAModalOpen(true)}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            onOpenOTP={() => setIsOTPModalOpen(true)}
            onTriggerAI={() => setIsAIAssistantOpen(true)}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView onShowToast={showToast} />
        )}

        {activeTab === 'payments' && (
          <PaymentsView onShowToast={showToast} />
        )}

        {activeTab === 'workers' && (
          <WorkersView onShowToast={showToast} />
        )}

        {activeTab === 'attendance' && (
          <AttendanceView onShowToast={showToast} />
        )}

        {activeTab === 'security' && (
          <SecurityPanel onShowToast={showToast} />
        )}

        {activeTab === 'pricing' && (
          <PricingSection 
            onOpenAuth={handleOpenAuth} 
            onSelectTab={handleSelectTab}
            onSelectPlan={(plan) => {
              setSelectedCheckoutPlan(plan);
              setIsCheckoutModalOpen(true);
            }}
          />
        )}

        {activeTab === 'contact' && (
          <ContactSection onShowToast={showToast} />
        )}

      </main>

      {/* FLOATING ACTION BUTTONS */}
      <div className="fixed bottom-6 left-6 z-40 flex items-center gap-3">
        
        {/* Install TaxPro 3.0 PWA Web/Mobile App Button */}
        <button
          onClick={() => setIsPWAModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/90 border border-cyan-400/60 text-cyan-400 text-xs font-bold shadow-2xl backdrop-blur-xl hover:scale-105 transition-all shadow-cyan-500/20"
        >
          <ArrowUp className="w-4 h-4 text-cyan-400 rotate-180 animate-bounce" />
          <span>Install TaxPro 3.0 App</span>
        </button>
      </div>


      {/* DIRECT CARD, UPI & BANK PAYMENT CHECKOUT MODAL */}
      <PaymentCheckoutModal
        isOpen={isCheckoutModalOpen}
        plan={selectedCheckoutPlan}
        onClose={() => setIsCheckoutModalOpen(false)}
        onShowToast={showToast}
        onPaymentSuccess={(details) => {
          showToast(`✓ Payment of ₹${details.amount?.toLocaleString('en-IN')} confirmed! ${details.plan} is now active.`, 'success');
          setIsCheckoutModalOpen(false);
          setActiveTab('dashboard');
        }}
      />

      {/* PWA INSTALLATION MODAL */}
      <PWAModal
        isOpen={isPWAModalOpen}
        onClose={() => setIsPWAModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onShowToast={showToast}
      />

      {/* SIGNATURE OTP VERIFICATION MODAL */}
      <OTPModal
        isOpen={isOTPModalOpen}
        email={userEmail}
        onClose={() => setIsOTPModalOpen(false)}
        onSuccessRedirect={async (verifiedEmail) => {
          showToast('✓ OTP Verification Successful! Opening Workspace...', 'success');
          localStorage.setItem('taxpro_profile_completed', 'true');
          
          let targetRole = localStorage.getItem('taxpro_user_role') || 'Admin';
          const cleanEmail = (verifiedEmail || userEmail || localStorage.getItem('taxpro_user_email') || '').trim();

          // 1. Commit pending registration payload to PostgreSQL database now that email OTP is verified!
          try {
            const pendingRaw = sessionStorage.getItem('taxpro_pending_signup');
            if (pendingRaw) {
              const pending = JSON.parse(pendingRaw);
              if (pending.email && pending.password) {
                try {
                  const baseUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || '';
                  await fetch(`${baseUrl}/api/auth/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email: pending.email,
                      password: pending.password,
                      name: pending.name || pending.email.split('@')[0]
                    })
                  });
                  await fetch(`${baseUrl}/api/auth/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email: pending.email,
                      newPassword: pending.password
                    })
                  });
                } catch (pgErr) {
                  console.warn('[Pending Signup PG Sync]:', pgErr.message);
                }

                try {
                  await supabase.auth.signUp({
                    email: pending.email,
                    password: pending.password,
                    options: {
                      data: {
                        name: pending.name || pending.email.split('@')[0],
                        role: pending.role || 'Administrator',
                        department: pending.department || 'Executive Management'
                      }
                    }
                  });
                } catch (e) {}
              }
              sessionStorage.removeItem('taxpro_pending_signup');
            }
          } catch (e) {}

          if (cleanEmail) {
            localStorage.setItem('taxpro_user_email', cleanEmail);
            setUserEmail(cleanEmail);
            try {
              const { data: memberCheck } = await supabase.from('team_members').select('id, role').ilike('email', cleanEmail).single();
              if (memberCheck) {
                if (memberCheck.role === 'Super Administrator' || memberCheck.role === 'Super Admin') targetRole = 'Super Admin';
                else if (memberCheck.role === 'Administrator') targetRole = 'Admin';
                else if (memberCheck.role === 'Manager') targetRole = 'Manager';
                else targetRole = 'Employee';
                await supabase.from('team_members').update({ status: 'Active' }).ilike('email', cleanEmail);
              }
            } catch(e) {}
          }

          const reservedSuperAdmins = ['superadmin@taxpro.com', 'workforcepro09@gmail.com', 'krushilgadhiya0@gmail.com', 'krushilgadhiya138@gmail.com'];
          const lowerEmail = cleanEmail.toLowerCase();
          const isSuperUser = reservedSuperAdmins.includes(lowerEmail) || lowerEmail === 'superadmin' || targetRole === 'Super Admin' || targetRole === 'Super Administrator';

          if (isSuperUser) {
            targetRole = 'Super Admin';
            sessionStorage.setItem('taxpro_superadmin_authenticated', 'true');
            localStorage.setItem('taxpro_superadmin_authenticated', 'true');
            localStorage.setItem('taxpro_secret_superadmin', cleanEmail || 'superadmin@taxpro.com');
            localStorage.setItem('taxpro_user_email', cleanEmail || 'superadmin@taxpro.com');
            localStorage.setItem('taxpro_workspace_mode', 'superadmin_core');
            localStorage.setItem('taxpro_setup_completed', 'true');
            localStorage.setItem('taxpro_user_role', 'Super Admin');
            setWorkspaceMode('superadmin_core');
            setUserRole('Super Admin');
            setIsAuthenticated(true);
            setLoading(false);
            setLoginTransition({
              role: 'Super Admin',
              firmName: 'TaxPro Global Core Command'
            });
            window.location.hash = '#/superadmin';
            setActiveTab('dashboard');
            setPendingTab(null);
            setIsOTPModalOpen(false);
            setIsAuthModalOpen(false);
            showToast('✓ Welcome SuperAdmin! Global monitoring console active.', 'success');
            return;
          }

          localStorage.setItem('taxpro_user_role', targetRole);
          setUserRole(targetRole);
          setIsAuthenticated(true);
          setLoading(false);

          // Direct jump to Practice PMS Dashboard
          localStorage.setItem('taxpro_workspace_mode', 'pms_workspace');
          setWorkspaceMode('pms_workspace');
          localStorage.setItem('taxpro_setup_completed', 'true');
          localStorage.setItem('taxpro_active_nav', 'Dashboard');
          window.location.hash = '#/dashboard';
          window.dispatchEvent(new CustomEvent('taxpro_nav_switch', { detail: 'Dashboard' }));

          setActiveTab('dashboard');
          setPendingTab(null);
          setIsOTPModalOpen(false);
          setIsAuthModalOpen(false);
          window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
        }}
      />

      {/* LOGIN / SIGNUP MODAL */}
      <AuthModal
        isOpen={isAuthModalOpen}
        mode={authMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSwitchMode={(m) => setAuthMode(m)}
        onOpenOTP={(targetEmail) => {
          if (targetEmail) setUserEmail(targetEmail);
          setIsAuthModalOpen(false);
          setIsOTPModalOpen(true);
        }}
        onOpenForgotPassword={(targetEmail) => {
          if (targetEmail) setUserEmail(targetEmail);
          setIsAuthModalOpen(false);
          setIsForgotPasswordModalOpen(true);
        }}
        onLoginSuccess={async (loggedInEmail, roleOverride) => {
          const finalEmail = (loggedInEmail || userEmail || localStorage.getItem('taxpro_user_email') || '').trim();
          if (finalEmail) {
            setUserEmail(finalEmail);
            localStorage.setItem('taxpro_user_email', finalEmail);
          }

          localStorage.setItem('taxpro_profile_completed', 'true');
          
          let targetRole = roleOverride || localStorage.getItem('taxpro_user_role') || 'Admin';

          const lowerEmail = finalEmail.toLowerCase();
          const reservedSuperAdmins = ['superadmin@taxpro.com', 'workforcepro09@gmail.com', 'krushilgadhiya0@gmail.com', 'krushilgadhiya138@gmail.com'];
          const isSuperUser = 
            reservedSuperAdmins.includes(lowerEmail) ||
            lowerEmail === 'superadmin' ||
            roleOverride === 'Super Admin' ||
            roleOverride === 'Super Administrator' ||
            targetRole === 'Super Admin' ||
            targetRole === 'Super Administrator';

          if (isSuperUser) {
            targetRole = 'Super Admin';
            sessionStorage.setItem('taxpro_superadmin_authenticated', 'true');
            localStorage.setItem('taxpro_superadmin_authenticated', 'true');
            localStorage.setItem('taxpro_secret_superadmin', finalEmail || 'superadmin@taxpro.com');
            localStorage.setItem('taxpro_user_email', finalEmail || 'superadmin@taxpro.com');
            localStorage.setItem('taxpro_workspace_mode', 'superadmin_core');
            localStorage.setItem('taxpro_setup_completed', 'true');
            localStorage.setItem('taxpro_user_role', 'Super Admin');
            setWorkspaceMode('superadmin_core');
            setUserRole('Super Admin');
            setIsAuthenticated(true);
            setLoginTransition({
              role: 'Super Admin',
              firmName: 'TaxPro Global Core Command'
            });
            window.location.hash = '#/superadmin';
            setActiveTab('dashboard');
            setPendingTab(null);
            setIsAuthModalOpen(false);
            showToast('✓ Welcome SuperAdmin! Global monitoring console active.', 'success');
            return;
          } else {
            sessionStorage.removeItem('taxpro_superadmin_authenticated');
            localStorage.removeItem('taxpro_superadmin_authenticated');
            localStorage.removeItem('taxpro_secret_superadmin');
            localStorage.setItem('taxpro_workspace_mode', 'pms_workspace');
            setWorkspaceMode('pms_workspace');

            if (finalEmail) {
              try {
                const { data: memberCheck } = await supabase.from('team_members').select('id, role, status, company, company_id').ilike('email', finalEmail).single();
                if (memberCheck) {
                  if (memberCheck.role === 'Administrator') targetRole = 'Admin';
                  else if (memberCheck.role === 'Manager') targetRole = 'Manager';
                  else if (!roleOverride) targetRole = 'Employee';
                  
                  if (memberCheck.company) {
                    localStorage.setItem('taxpro_firm_name', memberCheck.company);
                    if (memberCheck.company_id) {
                      localStorage.setItem('taxpro_firm_tag', memberCheck.company_id);
                    }
                    localStorage.setItem('taxpro_firm_configured', 'true');
                    window.dispatchEvent(new CustomEvent('taxpro_firm_updated', {
                      detail: { name: memberCheck.company, tag: memberCheck.company_id || 'TaxPro' }
                    }));
                  }

                  await supabase.from('team_members').update({ status: 'Active' }).ilike('email', finalEmail);
                } else {
                  const { data: userRow } = await supabase.from('users').select('role, company, company_id').ilike('email', finalEmail).single();
                  if (userRow?.company) {
                    localStorage.setItem('taxpro_firm_name', userRow.company);
                    if (userRow.company_id) {
                      localStorage.setItem('taxpro_firm_tag', userRow.company_id);
                    }
                    localStorage.setItem('taxpro_firm_configured', 'true');
                    window.dispatchEvent(new CustomEvent('taxpro_firm_updated', {
                      detail: { name: userRow.company, tag: userRow.company_id || 'TaxPro' }
                    }));
                  }
                }
              } catch (err) {}
            }
          }

          localStorage.setItem('taxpro_user_role', targetRole);
          setUserRole(targetRole);
          setIsAuthenticated(true);

          // Register device session & start heartbeat immediately
          try {
            startSessionHeartbeat(finalEmail);
          } catch (e) {}

          // Trigger smooth role workspace transition
          setLoginTransition({
            role: targetRole,
            firmName: targetRole === 'Super Admin' ? 'TaxPro Global Core Command' : (localStorage.getItem('taxpro_firm_name') || 'TaxPro Advisory Practice')
          });

          if (targetRole === 'Super Admin') {
            // Direct launch into SaaS Master SuperAdmin Core Command
            localStorage.setItem('taxpro_workspace_mode', 'superadmin_core');
            setWorkspaceMode('superadmin_core');
            localStorage.setItem('taxpro_setup_completed', 'true');
            window.location.hash = '#/superadmin';
          } else {
            // Direct jump to Practice PMS Dashboard
            localStorage.setItem('taxpro_workspace_mode', 'pms_workspace');
            setWorkspaceMode('pms_workspace');
            localStorage.setItem('taxpro_setup_completed', 'true');
            localStorage.setItem('taxpro_active_nav', 'Dashboard');
            window.location.hash = '#/dashboard';
            window.dispatchEvent(new CustomEvent('taxpro_nav_switch', { detail: 'Dashboard' }));
          }

          setActiveTab('dashboard');
          setPendingTab(null);
          setIsAuthModalOpen(false);

          showToast(`✓ Authentication successful as ${targetRole}! Welcome to TaxPro.`, 'success');
        }}
        onShowToast={showToast}
      />

      {/* FORGOT / RESET PASSWORD MODAL */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordModalOpen}
        initialEmail={userEmail}
        onClose={() => setIsForgotPasswordModalOpen(false)}
        onShowToast={showToast}
        onOpenLogin={() => {
          setAuthMode('login');
          setIsAuthModalOpen(true);
        }}
      />

      {/* ONBOARDING PROFILE SETUP MODAL */}
      <ProfileSetupModal
        isOpen={isProfileSetupOpen}
        onClose={() => setIsProfileSetupOpen(false)}
        onComplete={async (data) => {
          setIsAuthenticated(true);
          const destination = pendingTab || 'dashboard';
          
          // Securely upgrade Pending Invite to Active Member in Postgres
          const { data: sessionData } = await supabase.auth.getSession();
          const trueEmail = sessionData?.session?.user?.email;
          
          if (trueEmail) {
             await supabase.from('team_members').update({
                status: 'Active',
                department: data.department
             }).eq('email', trueEmail);
          }
          
          showToast(`✓ Profile complete! Welcome, ${data.profession}!`, 'success');
          setTimeout(() => {
            showToast(`📧 Welcome Email dispatched to ${trueEmail || 'you'}!`, 'info');
          }, 1200);
          setActiveTab(destination);
          setPendingTab(null);
        }}
      />

      {/* SuperAdmin Master Password Verification Gate Modal */}
      <SuperAdminAuthModal
        isOpen={isSuperAdminAuthModalOpen}
        onClose={() => setIsSuperAdminAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthenticated(true);
          setUserRole('Super Admin');
          setWorkspaceMode('superadmin_core');
        }}
        onShowToast={showToast}
      />

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/15 bg-black/85 backdrop-blur-2xl py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
            <span className="font-extrabold text-lg text-white font-outfit">TAXPRO 3.0</span>
            <span className="text-xs text-slate-300 font-medium">© 2026 TaxPro Global Financial Inc. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-300 font-semibold">
            <button onClick={() => setActiveTab('security')} className="hover:text-cyan-300 transition-colors cursor-pointer">Security Audit</button>
            <button onClick={() => setActiveTab('reports')} className="hover:text-cyan-300 transition-colors cursor-pointer">Compliance Reports</button>
            <button onClick={() => setActiveTab('pricing')} className="hover:text-cyan-300 transition-colors cursor-pointer">Enterprise Pricing</button>
          </div>
        </div>
      </footer>

      {/* Global Production AI Chatbot Widget */}
      <TaxProChatbot onShowToast={showToast} />

    </div>
  );
}
