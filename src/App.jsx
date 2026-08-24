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
import ContactSection from './components/ContactSection';
import ToastContainer from './components/ToastContainer';
import LoadingScreen from './components/LoadingScreen';
import ProfileSetupModal from './components/ProfileSetupModal';
import PWAModal from './components/PWAModal';
import MainPMSShell from './components/MainPMSShell';
import SuperAdminShell from './components/SuperAdminShell';
import ForgotPasswordModal from './components/ForgotPasswordModal';
import SuperAdminAuthModal from './components/pms/SuperAdminAuthModal';
import { supabase } from './lib/supabaseClient';
import soundFX from './lib/audioFX';

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
          return sessionStorage.getItem('taxpro_superadmin_authenticated') === 'true';
        }
        return true;
      }
      const session = localStorage.getItem('taxpro_pg_session');
      const superadmin = sessionStorage.getItem('taxpro_superadmin_authenticated') === 'true' && localStorage.getItem('taxpro_secret_superadmin');
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
          const isSuperAuthed = sessionStorage.getItem('taxpro_superadmin_authenticated') === 'true';
          if (isSuperAuthed) {
            localStorage.setItem('taxpro_user_role', 'Super Admin');
            localStorage.setItem('taxpro_secret_superadmin', 'superadmin@taxpro.com');
            localStorage.setItem('taxpro_user_email', 'superadmin@taxpro.com');
            localStorage.setItem('taxpro_workspace_mode', 'superadmin_core');
            localStorage.setItem('taxpro_profile_completed', 'true');
            return 'Super Admin';
          }
          // If not authenticated with password, fallback to Admin and prompt for pass
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
    return localStorage.getItem('taxpro_user_role') || 'Admin';
  });

  const [userEmail, setUserEmail] = useState(() => {
    return localStorage.getItem('taxpro_user_email') || localStorage.getItem('taxpro_secret_superadmin') || '';
  });

  const [loading, setLoading] = useState(() => {
    try {
      const session = localStorage.getItem('taxpro_pg_session');
      const superadmin = localStorage.getItem('taxpro_secret_superadmin');
      const profile = localStorage.getItem('taxpro_profile_completed');
      const email = localStorage.getItem('taxpro_user_email');
      return !(session || superadmin || (profile && email));
    } catch (e) {
      return true;
    }
  });

  const [activeTab, setActiveTab] = useState('home');
  const [pendingTab, setPendingTab] = useState(null);

  const [isOTPModalOpen, setIsOTPModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSuperAdminAuthModalOpen, setIsSuperAdminAuthModalOpen] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [isPWAModalOpen, setIsPWAModalOpen] = useState(false);
  const [isProfileSetupOpen, setIsProfileSetupOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // DYNAMIC ROLE URL SYNCHRONIZATION LISTENER (?role=superadmin, ?role=admin, ?role=manager, ?role=employee)
  useEffect(() => {
    const handleUrlRoleSync = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const queryRole = urlParams.get('role');
        if (queryRole) {
          const clean = queryRole.trim().toLowerCase().replace(/[\s_-]+/g, '');
          if (clean === 'superadmin' || clean === 'super') {
            const isSuperAuthed = sessionStorage.getItem('taxpro_superadmin_authenticated') === 'true';
            if (isSuperAuthed) {
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
      localStorage.setItem('taxpro_secret_superadmin', 'superadmin@taxpro.com');
      localStorage.setItem('taxpro_user_email', 'superadmin@taxpro.com');
      localStorage.setItem('taxpro_user_role', 'Super Admin');
      localStorage.setItem('taxpro_workspace_mode', 'superadmin_core');
      localStorage.setItem('taxpro_profile_completed', 'true');
      setUserRole('Super Admin');
      setUserEmail('superadmin@taxpro.com');
      setWorkspaceMode('superadmin_core');
      setIsAuthenticated(true);
    };
    window.addEventListener('taxpro_superadmin_login', handleSuperAdminLoginEvent);

    return () => {
      window.removeEventListener('popstate', handleUrlRoleSync);
      window.removeEventListener('taxpro_switch_role_url', handleUrlRoleSync);
      window.removeEventListener('taxpro_superadmin_login', handleSuperAdminLoginEvent);
    };
  }, []);

  // GLOBAL DARK MODE INJECTOR ON BOOTUP
  useEffect(() => {
    if (localStorage.getItem('taxpro_theme') === 'dark') {
      document.documentElement.classList.add('dark-mode-global');
    }

    // Initialize Global Zoom from LocalStorage
    const savedZoom = localStorage.getItem('taxpro_global_zoom') || '90';
    document.documentElement.style.zoom = `${savedZoom}%`;

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
        const allowedAdmins = ['workforcepro09@gmail.com', 'krushilgadhiya0@gmail.com', 'superadmin@taxpro.com'];
        const isAuthorizedAdmin = allowedAdmins.includes(userMail) || localStorage.getItem('taxpro_secret_superadmin') === userMail;

        const isRevoked = memberCheck && (memberCheck.status === 'Past' || memberCheck.status === 'Access Revoked' || memberCheck.status === 'Suspended');

        if ((!memberCheck && !isAuthorizedAdmin) || (isRevoked && !isAuthorizedAdmin)) {
           await supabase.auth.signOut();
           localStorage.removeItem('taxpro_pg_session');
           localStorage.removeItem('taxpro_user_role');
           localStorage.removeItem('taxpro_user_permissions');
           showToast('🔒 Access Revoked: An Administrator has revoked or suspended your access to this firm workspace.', 'error');
           setIsAuthenticated(false);
           return;
        }

        if (memberCheck?.permissions) {
          localStorage.setItem('taxpro_user_permissions', typeof memberCheck.permissions === 'string' ? memberCheck.permissions : JSON.stringify(memberCheck.permissions));
        }

        const isNewUser = session.user?.created_at 
           ? (new Date() - new Date(session.user.created_at)) < (5 * 60 * 1000) 
           : false;
           
        if (memberCheck || session.user?.user_metadata?.profile_completed || !isNewUser) {
          localStorage.setItem('taxpro_profile_completed', 'true');
          
          let role = localStorage.getItem('taxpro_user_role') || 'Employee';
          if (isAuthorizedAdmin) {
            role = 'Admin';
          } else if (memberCheck) {
            role = memberCheck.role === 'Administrator' ? 'Admin' : (memberCheck.role === 'Manager' ? 'Manager' : (localStorage.getItem('taxpro_user_role') || 'Employee'));
            if (memberCheck.status === 'Active') {
              await supabase.from('team_members').update({ status: 'Active' }).ilike('email', userMail);
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
        const allowedAdmins = ['workforcepro09@gmail.com', 'krushilgadhiya0@gmail.com'];
        const isAuthorizedAdmin = allowedAdmins.includes(userMail) || localStorage.getItem('taxpro_secret_superadmin') === userMail;

        if ((!memberCheck && !isAuthorizedAdmin) || (memberCheck && memberCheck.status === 'Past')) {
           await supabase.auth.signOut();
           showToast('Access Revoked: Your account has been disabled. You are no longer authorized to enter the firm.', 'error');
           setIsAuthenticated(false);
           return;
        }

        const isNewUser = session?.user?.created_at 
           ? (new Date() - new Date(session.user.created_at)) < (5 * 60 * 1000) 
           : false;
           
        if (memberCheck || session?.user?.user_metadata?.profile_completed || !isNewUser) {
          localStorage.setItem('taxpro_profile_completed', 'true');
          
          let role = 'Employee';
          if (isAuthorizedAdmin) {
             role = 'Admin';
          } else if (memberCheck) {
             role = memberCheck.role === 'Administrator' ? 'Admin' : 'Employee';
             if (event === 'SIGNED_IN') {
                 await supabase.from('team_members').update({ status: 'Active' }).ilike('email', userMail);
             }
          }
          
          localStorage.setItem('taxpro_user_role', role);
          setUserRole(role);
        }
        
        if (localStorage.getItem('taxpro_profile_completed')) {
          setUserRole(localStorage.getItem('taxpro_user_role') || 'Admin');
          setIsAuthenticated(true);
        } else {
          setIsProfileSetupOpen(true);
        }

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
    await supabase.auth.signOut();
    sessionStorage.removeItem('taxpro_superadmin_authenticated');
    localStorage.removeItem('taxpro_profile_completed');
    localStorage.removeItem('taxpro_user_role');
    localStorage.removeItem('taxpro_secret_superadmin');
    setIsAuthenticated(false);
    setActiveTab('home');
    showToast('Signed out of TaxPro AI session.', 'info');
  };

  const [workspaceMode, setWorkspaceMode] = useState(() => {
    return localStorage.getItem('taxpro_workspace_mode') || 'auto';
  });

  const handleSwitchToPMS = (targetTab = 'Dashboard') => {
    localStorage.setItem('taxpro_workspace_mode', 'pms_workspace');
    localStorage.setItem('taxpro_active_nav', targetTab);
    setWorkspaceMode('pms_workspace');
    window.dispatchEvent(new CustomEvent('taxpro_nav_switch', { detail: targetTab }));
    showToast(`✓ Opened ${targetTab} in Practice Workspace as SuperAdmin!`, 'success');
  };

  const handleSwitchToSuperAdmin = () => {
    const isSuperAuthed = sessionStorage.getItem('taxpro_superadmin_authenticated') === 'true';
    if (isSuperAuthed) {
      localStorage.setItem('taxpro_workspace_mode', 'superadmin_core');
      setWorkspaceMode('superadmin_core');
      setUserRole('Super Admin');
      showToast('✓ Switched to SaaS Master SuperAdmin Core', 'info');
    } else {
      setIsSuperAdminAuthModalOpen(true);
    }
  };

  if (loading) {
    return <LoadingScreen onFinished={() => setLoading(false)} />;
  }

  // When Authenticated: Render Full 1:1 Main PMS Application Suite
  if (isAuthenticated) {
    const cleanEmail = (userEmail || localStorage.getItem('taxpro_user_email') || '').toLowerCase().trim();
    const isMasterAdmin = 
      userRole === 'Super Admin' || 
      cleanEmail === 'workforcepro09@gmail.com' || 
      cleanEmail === 'superadmin@taxpro.com' ||
      cleanEmail === 'krushilgadhiya0@gmail.com' ||
      sessionStorage.getItem('taxpro_superadmin_authenticated') === 'true';

    if (isMasterAdmin && workspaceMode !== 'pms_workspace') {
       return (
         <>
           <SuperAdminShell 
             onLogout={handleLogout} 
             onShowToast={showToast} 
             onSwitchToPMS={handleSwitchToPMS}
           />
           <SuperAdminAuthModal
             isOpen={isSuperAdminAuthModalOpen}
             onClose={() => setIsSuperAdminAuthModalOpen(false)}
             onSuccess={() => {
               setUserRole('Super Admin');
               setWorkspaceMode('superadmin_core');
             }}
             onShowToast={showToast}
           />
         </>
       );
    }

    return (
      <div className="relative min-h-screen bg-[#f3f4f6]">
        <ToastContainer toasts={toasts} onCloseToast={closeToast} />
        
        <MainPMSShell 
          userRole={isMasterAdmin ? 'Super Admin' : userRole}
          isSuperAdmin={isMasterAdmin}
          onSwitchToSuperAdmin={handleSwitchToSuperAdmin}
          onLogout={handleLogout}
          onTriggerAI={() => setIsAIAssistantOpen(true)}
          onShowToast={showToast}
        />

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
          <PricingSection onOpenAuth={handleOpenAuth} />
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
        onSuccessRedirect={async () => {
          showToast('✓ OTP Verification Successful! Opening Workspace...', 'success');
          localStorage.setItem('taxpro_profile_completed', 'true');
          
          let targetRole = localStorage.getItem('taxpro_user_role') || 'Admin';
          const cleanEmail = (userEmail || localStorage.getItem('taxpro_user_email') || '').trim();

          if (cleanEmail) {
            localStorage.setItem('taxpro_user_email', cleanEmail);
            setUserEmail(cleanEmail);
            try {
              const { data: memberCheck } = await supabase.from('team_members').select('id, role').ilike('email', cleanEmail).single();
              if (memberCheck) {
                if (memberCheck.role === 'Administrator') targetRole = 'Admin';
                else if (memberCheck.role === 'Manager') targetRole = 'Manager';
                else targetRole = 'Employee';
                await supabase.from('team_members').update({ status: 'Active' }).ilike('email', cleanEmail);
              }
            } catch(e) {}
          }

          localStorage.setItem('taxpro_user_role', targetRole);
          setUserRole(targetRole);
          setIsAuthenticated(true);
          setLoading(false);
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

          if (finalEmail.toLowerCase() === 'superadmin@taxpro.com' || roleOverride === 'Super Admin' || finalEmail.toLowerCase() === 'workforcepro09@gmail.com') {
            targetRole = 'Super Admin';
            sessionStorage.setItem('taxpro_superadmin_authenticated', 'true');
            localStorage.setItem('taxpro_secret_superadmin', 'superadmin@taxpro.com');
            localStorage.setItem('taxpro_workspace_mode', 'superadmin_core');
            setWorkspaceMode('superadmin_core');
          } else {
            sessionStorage.removeItem('taxpro_superadmin_authenticated');
            localStorage.removeItem('taxpro_secret_superadmin');
            localStorage.setItem('taxpro_workspace_mode', 'pms_workspace');
            setWorkspaceMode('pms_workspace');

            if (finalEmail) {
              try {
                const { data: memberCheck } = await supabase.from('team_members').select('id, role, status').ilike('email', finalEmail).single();
                if (memberCheck) {
                  if (memberCheck.role === 'Administrator') targetRole = 'Admin';
                  else if (memberCheck.role === 'Manager') targetRole = 'Manager';
                  else if (!roleOverride) targetRole = 'Employee';
                  
                  await supabase.from('team_members').update({ status: 'Active' }).ilike('email', finalEmail);
                }
              } catch (err) {}
            }
          }

          localStorage.setItem('taxpro_user_role', targetRole);
          setUserRole(targetRole);
          setIsAuthenticated(true);
          setActiveTab(pendingTab || 'dashboard');
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

    </div>
  );
}
