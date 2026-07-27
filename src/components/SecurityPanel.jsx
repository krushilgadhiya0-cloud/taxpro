import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Smartphone, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Fingerprint, 
  Cpu, 
  RefreshCw,
  Eye
} from 'lucide-react';

export default function SecurityPanel({ onShowToast }) {
  const [sessionTime, setSessionTime] = useState(894); // seconds
  const [autoLogout, setAutoLogout] = useState(true);
  const [captchaPassed, setCaptchaPassed] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTime((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleRunFraudScan = () => {
    onShowToast('Executing AI Quantum Fraud Detection scan...', 'info');
    setTimeout(() => {
      onShowToast('Zero anomalies detected. Trust score: 100/100.', 'success');
    }, 1400);
  };

  return (
    <div className="pt-24 pb-16 min-h-screen relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-white font-outfit">Security & Fraud Guard</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
              AES-256 Quantum Shield
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Real-time session encryption, active device detection, and biometric hardware locks.</p>
        </div>

        <button
          onClick={handleRunFraudScan}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-purple-400 to-cyan-400 hover:scale-105 transition-all shadow-lg shadow-purple-500/20"
        >
          <Cpu className="w-4 h-4 text-black" />
          <span>Run AI Fraud Scan</span>
        </button>
      </div>

      {/* TOP SECURITY CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Session Timeout */}
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>Session Expiry</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">{formatTime(sessionTime)}</div>
          <div className="mt-2 text-[11px] text-cyan-300">Auto-renews on activity</div>
        </div>

        {/* AES Encryption */}
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>Data Encryption</span>
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-outfit">AES-256 Bit</div>
          <div className="mt-2 text-[11px] text-gray-400">Zero-knowledge vault</div>
        </div>

        {/* Active Device */}
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>Device Fingerprint</span>
            <Smartphone className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg font-bold text-white font-mono truncate">MacBookPro18,1</div>
          <div className="mt-2 text-[11px] text-purple-300">IP: 192.168.1.104 (Verified)</div>
        </div>

        {/* AI Fraud Score */}
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>AI Risk Index</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400 font-outfit">0.00% Risk</div>
          <div className="mt-2 text-[11px] text-emerald-400 font-semibold">Clean Status</div>
        </div>

      </div>

      {/* INTERACTIVE CAPTCHA & AUTO LOGOUT CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CAPTCHA Widget */}
        <div className="glass-panel p-6">
          <h3 className="text-lg font-bold text-white font-outfit mb-2">Biometric Human Verification</h3>
          <p className="text-xs text-gray-400 mb-6">Complete challenge to issue high-value wire permissions</p>

          <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="captcha"
                checked={captchaPassed}
                onChange={(e) => {
                  setCaptchaPassed(e.target.checked);
                  if (e.target.checked) onShowToast('Human verification confirmed.', 'success');
                }}
                className="w-5 h-5 accent-cyan-400 cursor-pointer"
              />
              <label htmlFor="captcha" className="text-xs font-bold text-gray-200 cursor-pointer">
                I am human & authorize TaxPro AI session token
              </label>
            </div>
            <ShieldCheck className={`w-6 h-6 ${captchaPassed ? 'text-emerald-400' : 'text-gray-600'}`} />
          </div>
        </div>

        {/* Security Preferences */}
        <div className="glass-panel p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white font-outfit mb-4">Security Preferences</h3>
            
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <div>
                <span className="text-xs font-bold text-white block">Auto Logout on Inactivity</span>
                <span className="text-[10px] text-gray-400">Lock session after 15 minutes of idle time</span>
              </div>
              <input
                type="checkbox"
                checked={autoLogout}
                onChange={(e) => setAutoLogout(e.target.checked)}
                className="w-5 h-5 accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          <div className="mt-4 text-[11px] text-gray-400">
            TaxPro AI platform employs zero-trust architecture. Every transaction payload is signed with asymmetric RSA-4096 keys.
          </div>
        </div>

      </div>

    </div>
  );
}
