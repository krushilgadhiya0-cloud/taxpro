import React, { useState, useEffect } from 'react';
import { 
  Fingerprint, 
  QrCode, 
  ScanFace, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Sparkles,
  Zap,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';

export default function AttendanceView({ onShowToast }) {
  const [activeScanner, setActiveScanner] = useState('fingerprint'); // 'fingerprint' | 'qr' | 'face'
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const startBiometricScan = () => {
    setIsScanning(true);
    setScanResult(null);
    onShowToast(`Initializing ${activeScanner.toUpperCase()} biometric scanner hardware...`, 'info');

    setTimeout(() => {
      setIsScanning(false);
      setScanResult({
        name: 'Dr. Sarah Jenkins',
        time: new Date().toLocaleTimeString(),
        status: 'VERIFIED & LOGGED',
        shift: 'Morning Shift A'
      });
      onShowToast(`Biometric match confirmed for Dr. Sarah Jenkins!`, 'success');
      if (window.confetti) {
        window.confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
      }
    }, 2200);
  };

  return (
    <div className="pt-24 pb-16 min-h-screen relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-white font-outfit">Biometric Attendance Terminal</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Laser Mesh 3.0
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Multi-modal verification suite supporting Fingerprint Laser, QR Targeting, and Face Mesh recognition.</p>
        </div>

        {/* Scanner Mode Toggles */}
        <div className="flex bg-white/[0.04] p-1 rounded-2xl border border-white/10">
          <button
            onClick={() => setActiveScanner('fingerprint')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeScanner === 'fingerprint' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Fingerprint className="w-4 h-4" /> Fingerprint
          </button>
          <button
            onClick={() => setActiveScanner('qr')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeScanner === 'qr' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-gray-400 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" /> QR Code
          </button>
          <button
            onClick={() => setActiveScanner('face')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeScanner === 'face' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : 'text-gray-400 hover:text-white'
            }`}
          >
            <ScanFace className="w-4 h-4" /> Face Recognition
          </button>
        </div>
      </div>

      {/* SCANNER VIEWPORT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Main Terminal Scanner Card */}
        <div className="lg:col-span-2 glass-panel p-8 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[380px]">
          
          {/* FINGERPRINT MODE */}
          {activeScanner === 'fingerprint' && (
            <div className="relative flex flex-col items-center">
              <div className="relative w-44 h-44 rounded-3xl bg-black/60 border border-cyan-500/40 flex items-center justify-center overflow-hidden shadow-2xl shadow-cyan-500/20">
                <Fingerprint className={`w-28 h-28 ${isScanning ? 'text-cyan-400 animate-pulse' : 'text-gray-500'}`} />
                
                {/* Laser Sweep Line */}
                {isScanning && <div className="laser-line" />}
              </div>

              <p className="mt-6 text-sm font-bold text-white font-outfit">
                {isScanning ? 'Scanning Fingerprint Minutiae Points...' : 'Place Thumb on Laser Scanner Window'}
              </p>
            </div>
          )}

          {/* QR SCANNER MODE */}
          {activeScanner === 'qr' && (
            <div className="relative flex flex-col items-center">
              <div className="relative w-44 h-44 rounded-3xl bg-black/60 border border-emerald-500/40 flex items-center justify-center overflow-hidden shadow-2xl shadow-emerald-500/20 p-4">
                <QrCode className={`w-full h-full ${isScanning ? 'text-emerald-400 animate-pulse' : 'text-gray-500'}`} />
                
                {/* Corner Targeting Reticles */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400"></div>
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400"></div>
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400"></div>
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400"></div>
              </div>

              <p className="mt-6 text-sm font-bold text-white font-outfit">
                {isScanning ? 'Decoding Encrypted TaxPro QR Code...' : 'Align Badge QR Code inside Reticle'}
              </p>
            </div>
          )}

          {/* FACE RECOGNITION MODE */}
          {activeScanner === 'face' && (
            <div className="relative flex flex-col items-center">
              <div className="relative w-44 h-44 rounded-3xl bg-black/60 border border-purple-500/40 flex items-center justify-center overflow-hidden shadow-2xl shadow-purple-500/20 biometric-grid">
                <ScanFace className={`w-24 h-24 ${isScanning ? 'text-purple-400 animate-pulse' : 'text-gray-500'}`} />
                
                {/* Biometric Mesh Overlay */}
                {isScanning && (
                  <div className="absolute inset-0 bg-purple-500/10 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="w-20 h-20 rounded-full border border-purple-400 animate-ping"></span>
                  </div>
                )}
              </div>

              <p className="mt-6 text-sm font-bold text-white font-outfit">
                {isScanning ? 'Mapping 128 Facial Landmark Vectors...' : 'Look Directly into High-Def Sensor'}
              </p>
            </div>
          )}

          {/* Scan Action Button */}
          <button
            onClick={startBiometricScan}
            disabled={isScanning}
            className="mt-6 btn-neon-primary px-8 py-3 text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/30"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-4 h-4 text-black animate-spin" />
                <span>Processing Biometrics...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-black" />
                <span>Trigger {activeScanner.toUpperCase()} Check-In</span>
              </>
            )}
          </button>

          {/* SCAN MATCH RESULT BANNER */}
          {scanResult && (
            <div className="mt-6 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-400/50 w-full max-w-md animate-fade-in flex items-center justify-between">
              <div className="flex items-center gap-3 text-left">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-white">{scanResult.name}</div>
                  <div className="text-[10px] text-emerald-300 font-mono">{scanResult.shift} • Logged at {scanResult.time}</div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-400 text-black">
                PASS
              </span>
            </div>
          )}

        </div>

        {/* Attendance Summary Side Panel */}
        <div className="glass-panel p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white font-outfit mb-4">Today's Shift Insights</h3>
            
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 block">On-Time Arrival</span>
                  <span className="text-2xl font-black text-emerald-400 font-outfit">139 / 142</span>
                </div>
                <Clock className="w-6 h-6 text-emerald-400" />
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 block">Late Arrivals</span>
                  <span className="text-2xl font-black text-amber-400 font-outfit">3 Staff</span>
                </div>
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 block">Average Working Hours</span>
                  <span className="text-2xl font-black text-cyan-400 font-outfit">8.4 hrs/day</span>
                </div>
                <Calendar className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </div>

          <div className="mt-6 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[11px] text-cyan-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>Anti-spoofing AI active. Proxy check-ins blocked.</span>
          </div>
        </div>

      </div>

    </div>
  );
}
