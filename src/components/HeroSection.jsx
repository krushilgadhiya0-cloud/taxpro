import React, { useState } from 'react';
import { 
  ArrowRight, 
  Play, 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  Zap, 
  Sparkles, 
  CheckCircle2, 
  DollarSign, 
  Activity,
  Fingerprint,
  Mail,
  Phone
} from 'lucide-react';
export default function HeroSection({ onGetStarted, onWatchDemo, onExploreDashboard, onShowToast }) {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  
  // Contact Form State
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [isSending, setIsSending] = useState(false);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setIsContactOpen(false);
      setContactForm({ name: '', email: '', message: '' });
      if (onShowToast) onShowToast('Thank you! Your message has been dropped into our primary inbox.', 'success');
      else alert('Thank you! Your message has been sent to our primary inbox.');
    }, 1500);
  };

  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotate({
      x: -(y / 25),
      y: (x / 25)
    });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden z-10">
      <div className="aurora-bg"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-cyan-500/30 backdrop-blur-xl shadow-lg shadow-cyan-500/10">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-semibold text-gray-200 tracking-wide">
              Introducing TaxPro AI 3.0 — The Future of Global Fintech
            </span>
          </div>
        </div>

        {/* Hero Title */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight font-outfit">
            Smart Finance.{' '}
            <span className="text-gradient-cyan">Smarter Future.</span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-gray-400 font-normal leading-relaxed max-w-3xl mx-auto">
            Manage workers, payroll, reports, expenses, attendance, analytics and payments—all in one intelligent ultra-premium platform.
          </p>

          {/* Action CTAs */}
          <div className="mt-9 flex items-center justify-center">
            
            {/* Get Started Button */}
            <button
              onClick={onGetStarted}
              className="btn-neon-primary px-9 py-4 text-base font-bold flex items-center gap-3 group justify-center shadow-xl shadow-cyan-500/30"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

          </div>

          {/* Feature Badges */}
          <div className="mt-10 flex flex-wrap justify-center items-center gap-6 text-xs text-gray-400 font-medium pb-6 border-b border-white/5">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Instant Bank Verification</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> Biometric Attendance</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-purple-400" /> AI Expense Forecasts</span>
          </div>
          
          {/* Contact Us Section */}
          <div className="mt-8 flex flex-col items-center justify-center gap-4">
            
            {!isContactOpen ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <span className="text-gray-500 font-semibold tracking-widest uppercase text-[10px]">Premium Enterprise Support:</span>
                <button 
                  onClick={() => setIsContactOpen(true)}
                  className="flex items-center gap-2 text-cyan-300 hover:text-cyan-200 transition-colors bg-cyan-500/10 px-6 py-2.5 rounded-full border border-cyan-500/20 shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20"
                >
                  <Mail className="w-4 h-4" /> Drop us a Message
                </button>
              </div>
            ) : (
              <div className="w-full max-w-md bg-white/[0.03] border border-cyan-500/30 rounded-3xl p-6 backdrop-blur-xl animate-fade-in shadow-2xl shadow-cyan-500/10 text-left relative mt-4">
                <button 
                  onClick={() => setIsContactOpen(false)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                  ✖
                </button>
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-bold text-white font-outfit">Contact Us Directly</h3>
                </div>
                
                <form onSubmit={handleContactSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Full Name</label>
                    <input 
                      required 
                      type="text" 
                      value={contactForm.name}
                      onChange={e => setContactForm({...contactForm, name: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-cyan-500 text-white" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Email Address</label>
                    <input 
                      required 
                      type="email" 
                      value={contactForm.email}
                      onChange={e => setContactForm({...contactForm, email: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-cyan-500 text-white" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Your Message</label>
                    <textarea 
                      required 
                      rows={3} 
                      value={contactForm.message}
                      onChange={e => setContactForm({...contactForm, message: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-cyan-500 text-white resize-none" 
                    />
                  </div>
                  <button 
                    disabled={isSending}
                    type="submit" 
                    className="w-full py-2.5 mt-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-bold text-sm rounded-xl shadow-lg hover:shadow-cyan-500/20 active:scale-95 transition-all text-center flex justify-center disabled:opacity-50"
                  >
                    {isSending ? 'Transmitting to Inbox...' : 'Send Message Securely'}
                  </button>
                </form>
              </div>
            )}
          </div>

        </div>

        {/* 3D ROTATING DASHBOARD PREVIEW ON MOUSE MOVEMENT */}
        <div className="mt-16 relative max-w-5xl mx-auto perspective-1000">
          
          <div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
              transition: 'transform 0.15s ease-out'
            }}
            className="glass-panel p-4 sm:p-6 border border-white/15 rounded-3xl shadow-2xl shadow-cyan-500/10 relative overflow-hidden cursor-default"
          >
            
            {/* Header: Members Showcase Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2 overflow-hidden">
                  <img className="inline-block h-9 w-9 rounded-full ring-2 ring-cyan-400 object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" alt="Sarah" />
                  <img className="inline-block h-9 w-9 rounded-full ring-2 ring-emerald-400 object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80" alt="Marcus" />
                  <img className="inline-block h-9 w-9 rounded-full ring-2 ring-purple-400 object-cover" src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80" alt="Elena" />
                  <img className="inline-block h-9 w-9 rounded-full ring-2 ring-blue-400 object-cover" src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80" alt="Amara" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-extrabold text-white flex items-center gap-1.5 font-outfit">
                    142 Active Members Logged
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  </span>
                  <span className="text-[10px] text-cyan-300 font-mono">Global TaxPro Workforce</span>
                </div>
              </div>

              <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/40 text-cyan-400 text-xs font-bold font-mono">
                ✦ 60 FPS Quantum Engine
              </div>
            </div>

            {/* FLOATING PLATFORM FEATURES GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Feature Card 1 */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-cyan-400/30 backdrop-blur-xl text-left hover:border-cyan-400 transition-colors group/card">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-3">
                  <Fingerprint className="w-5 h-5 text-cyan-400" />
                </div>
                <h4 className="text-sm font-bold text-white font-outfit">Biometric Attendance Scanner</h4>
                <p className="text-xs text-gray-400 mt-1">Laser Fingerprint sweep, QR scanning, and Face Mesh recognition.</p>
              </div>

              {/* Feature Card 2 */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-purple-400/30 backdrop-blur-xl text-left hover:border-purple-400 transition-colors group/card">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-3">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <h4 className="text-sm font-bold text-white font-outfit">Neural AI Forecast Engine</h4>
                <p className="text-xs text-gray-400 mt-1">Real-time expense predictions, payroll variance, and automated tax reports.</p>
              </div>

              {/* Feature Card 3 */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-emerald-400/30 backdrop-blur-xl text-left hover:border-emerald-400 transition-colors group/card">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-3">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <h4 className="text-sm font-bold text-white font-outfit">Multi-Rail Payment Settlements</h4>
                <p className="text-xs text-gray-400 mt-1">Instant payouts via UPI, Credit Card, Net Banking, and SWIFT wire.</p>
              </div>

              {/* Feature Card 4 */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-blue-400/30 backdrop-blur-xl text-left hover:border-blue-400 transition-colors group/card">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                </div>
                <h4 className="text-sm font-bold text-white font-outfit">AES-256 Quantum Vault</h4>
                <p className="text-xs text-gray-400 mt-1">SOC2 Type II compliance audit trails and zero-knowledge data security.</p>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
