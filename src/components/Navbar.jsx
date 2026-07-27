import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  BarChart3, 
  CreditCard, 
  Users, 
  CalendarCheck, 
  KeyRound, 
  Sparkles,
  Lock,
  Menu,
  X,
  Zap,
  Headset
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  onOpenOTP, 
  onOpenAuth, 
  isAuthenticated,
  onLogout,
  unreadNotifications, 
  onToggleNotificationDrawer 
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'home', label: 'Home', icon: Sparkles, protected: false },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, protected: true },
    { id: 'reports', label: 'Reports', icon: BarChart3, protected: true },
    { id: 'payments', label: 'Payments', icon: CreditCard, protected: true },
    { id: 'workers', label: 'Workers', icon: Users, protected: true },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck, protected: true },
    { id: 'security', label: 'Security', icon: Lock, protected: true },
    { id: 'pricing', label: 'Pricing', icon: Zap, protected: false },
    { id: 'contact', label: 'Contact Us', icon: Headset, protected: false },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
      scrolled ? 'glass-nav py-3' : 'bg-transparent py-5'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Brand Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setActiveTab('home')}
          >
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-emerald-400 p-[1px] shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-black/90 rounded-xl flex items-center justify-center backdrop-blur-md">
                <ShieldCheck className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5 font-outfit">
                TAXPRO <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">AI 3.0</span>
              </span>
              <span className="text-[10px] text-gray-400 font-medium tracking-wider uppercase -mt-0.5">Next-Gen Finance</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1 bg-white/[0.03] p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl">
            {navItems
              .filter((item) => isAuthenticated || !item.protected)
              .map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-400 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />
                    {item.label}
                  </button>
                );
              })}
          </div>

          {/* Right Action CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                  <span className="text-xs font-bold text-indigo-300">Krushil Gadhiya (CFO)</span>
                </div>
                <button
                  onClick={onLogout}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200"
                >
                  Login
                </button>

                <button
                  onClick={() => onOpenAuth('signup')}
                  className="btn-neon-primary px-4 py-1.5 text-xs font-bold shadow-md shadow-cyan-500/30"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              onClick={onOpenOTP}
              className="px-3 py-1 rounded-lg text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30"
            >
              OTP
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden glass-panel mx-4 mt-3 p-4 flex flex-col gap-2 border border-white/10 rounded-2xl animate-float">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-gray-400 hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
          <div className="pt-3 mt-2 border-t border-white/10 flex flex-col gap-2">
            <button
              onClick={() => {
                onOpenAuth('login');
                setMobileMenuOpen(false);
              }}
              className="w-full py-2 rounded-xl text-xs font-semibold text-gray-200 bg-white/5 border border-white/10"
            >
              Login to Account
            </button>
            <button
              onClick={() => {
                onOpenAuth('signup');
                setMobileMenuOpen(false);
              }}
              className="w-full py-2 btn-neon-primary text-xs"
            >
              Open Free Account
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
