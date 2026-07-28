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
import AIAssistant from './components/AIAssistant';
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
import { supabase } from './lib/supabaseClient';

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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);

  const [isOTPModalOpen, setIsOTPModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [isPWAModalOpen, setIsPWAModalOpen] = useState(false);
  const [isProfileSetupOpen, setIsProfileSetupOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [userEmail, setUserEmail] = useState('krushilgadhiya0@gmail.com');
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    // Ensure hovering # is removed on mount regardless
    if (window.location.href.endsWith('#')) {
      window.history.replaceState(null, null, window.location.pathname + window.location.search);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Supabase Global Auth Listener
    const checkSession = async () => {
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
        
        if (session.user?.user_metadata?.profile_completed) {
          localStorage.setItem('taxpro_profile_completed', 'true');
        }
        if (localStorage.getItem('taxpro_profile_completed')) {
          setIsAuthenticated(true);
          setActiveTab((prev) => ['home', 'pricing'].includes(prev) ? 'dashboard' : prev);
        } else {
          setIsProfileSetupOpen(true);
        }
      }
    };
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const userMail = session?.user?.email?.toLowerCase().trim();
        if (userMail) setUserEmail(userMail);

        if (userMail === 'workforcepro09@gmail.com') {
           setIsAuthenticated(true);
           return;
        }

        if (session?.user?.user_metadata?.profile_completed) {
          localStorage.setItem('taxpro_profile_completed', 'true');
        }
        if (localStorage.getItem('taxpro_profile_completed')) {
          setIsAuthenticated(true);
        } else {
          setIsProfileSetupOpen(true);
        }

        // Supabase often leaves a trailing '#' after parsing implicit OAuth hashes. Clean it up:
        if (window.location.href.endsWith('#')) {
          window.history.replaceState(null, null, window.location.pathname + window.location.search);
        }
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setActiveTab('home');
      }
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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
    localStorage.removeItem('taxpro_profile_completed');
    setIsAuthenticated(false);
    setActiveTab('home');
    showToast('Signed out of TaxPro AI session.', 'info');
  };

  if (loading) {
    return <LoadingScreen onFinished={() => setLoading(false)} />;
  }

  // When Authenticated: Render Full 1:1 Main PMS Application Suite
  if (isAuthenticated) {
    if (userEmail?.toLowerCase().trim() === 'workforcepro09@gmail.com') {
       return <SuperAdminShell onLogout={handleLogout} onShowToast={showToast} />;
    }

    return (
      <div className="relative min-h-screen bg-[#f3f4f6]">
        <ToastContainer toasts={toasts} onCloseToast={closeToast} />
        
        <MainPMSShell 
          onLogout={handleLogout}
          onTriggerAI={() => setIsAIAssistantOpen(true)}
          onShowToast={showToast}
        />

        {/* FLOATING AI ORB BUTTON */}
        {!isAIAssistantOpen && (
          <button
            onClick={() => setIsAIAssistantOpen(true)}
            className="fixed bottom-6 right-6 z-40 p-4 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 text-white shadow-2xl shadow-cyan-500/40 hover:scale-110 transition-transform group"
            title="Launch Neural AI"
          >
            <Bot className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-black animate-ping"></span>
          </button>
        )}

        <AIAssistant
          isOpen={isAIAssistantOpen}
          onClose={() => setIsAIAssistantOpen(false)}
          onShowToast={showToast}
          onLogout={handleLogout}
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
          <>
            <HeroSection
              onGetStarted={() => handleOpenAuth('login')}
              onWatchDemo={() => {
                showToast('Launching TaxPro AI Interactive Product Tour...', 'info');
                setActiveTab('dashboard');
              }}
              onExploreDashboard={() => setActiveTab('dashboard')}
              onPWAInstall={() => setIsPWAModalOpen(true)}
            />
            {/* Quick Teaser Grid on Home (Static Non-Clickable Info Cards) */}
            <div className="max-w-7xl mx-auto px-4 pb-20 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel p-6 border border-cyan-500/20 cursor-default">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-lg font-bold font-outfit text-white">Biometric Scanner Terminal</h3>
                <p className="text-xs text-gray-400 mt-2">Laser Fingerprint sweep, QR scanning, and Face Mesh recognition.</p>
              </div>

              <div className="glass-panel p-6 border border-emerald-500/20 cursor-default">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4">
                  <KeyRound className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold font-outfit text-white">Signature OTP Screen</h3>
                <p className="text-xs text-gray-400 mt-2">Continuous gradient ring spinner, particles, and verification pulses.</p>
              </div>

              <div className="glass-panel p-6 border border-purple-500/20 cursor-default">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-4">
                  <Bot className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-lg font-bold font-outfit text-white">Floating Neural AI</h3>
                <p className="text-xs text-gray-400 mt-2">Voice soundwave toggle, expense predictions, and tax reports.</p>
              </div>
            </div>
          </>
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
        onSuccessRedirect={() => {
          showToast('✓ Gmail OTP Verification Successful!', 'success');
          if (userEmail?.toLowerCase().trim() === 'workforcepro09@gmail.com') {
            setIsAuthenticated(true);
            return;
          }
          if (localStorage.getItem('taxpro_profile_completed')) {
            setIsAuthenticated(true);
            setActiveTab(pendingTab || 'dashboard');
            setPendingTab(null);
          } else {
            setIsProfileSetupOpen(true);
          }
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
        onLoginSuccess={() => {
          showToast('✓ Authentication successful!', 'success');
          if (userEmail?.toLowerCase().trim() === 'workforcepro09@gmail.com') {
            setIsAuthenticated(true);
            return;
          }
          if (localStorage.getItem('taxpro_profile_completed')) {
            setIsAuthenticated(true);
            setActiveTab(pendingTab || 'dashboard');
            setPendingTab(null);
          } else {
            setIsProfileSetupOpen(true);
          }
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
            showToast(`📧 Welcome Email dispatched to ${trueEmail || 'krushilgadhiya0@gmail.com'}!`, 'info');
          }, 1200);
          setActiveTab(destination);
          setPendingTab(null);
        }}
      />

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/10 bg-black/80 backdrop-blur-2xl py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
            <span className="font-extrabold text-lg text-white font-outfit">TAXPRO AI 3.0</span>
            <span className="text-xs text-gray-500">© 2026 TaxPro Global Financial Inc. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-gray-400">
            <button onClick={() => setActiveTab('security')} className="hover:text-white transition-colors">Security Audit</button>
            <button onClick={() => setActiveTab('reports')} className="hover:text-white transition-colors">Compliance Reports</button>
            <button onClick={() => setActiveTab('pricing')} className="hover:text-white transition-colors">Enterprise Pricing</button>
          </div>
        </div>
      </footer>

    </div>
  );
}
