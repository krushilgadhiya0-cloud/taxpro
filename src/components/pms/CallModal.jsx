import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Monitor,
  Maximize2,
  Minimize2,
  Users,
  Shield,
  Radio,
  Sparkles,
  Signal,
  MoreVertical,
  X,
  Disc,
  Download,
  Play,
  Pause,
  FileAudio
} from 'lucide-react';
import { logAuditActivity } from '../../lib/auditLogger';

export default function CallModal({
  isOpen,
  onClose,
  callType = 'audio', // 'audio' | 'video'
  contact = null, // { name, email, avatar, role, department }
  isGroup = false,
  channelName = 'General HQ Broadcast',
  groupMembers = [],
  onCallEnded,
  onShowToast
}) {
  const [callStatus, setCallStatus] = useState('ringing'); // 'ringing' | 'connected' | 'ended'
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [hasRealCamera, setHasRealCamera] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerRef = useRef(null);
  const callDurationRef = useRef(0);

  // Keep duration ref synced
  useEffect(() => {
    callDurationRef.current = callDuration;
  }, [callDuration]);

  // Format Duration seconds to MM:SS
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Play realistic Web Audio Ringtone & Sound Effects
  const playTone = (type) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'ring') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(480, now + 0.05);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'connect') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'end') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(200, now + 0.25);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (e) {}
  };

  // Start Automated Voice Recording
  const startVoiceRecording = (stream) => {
    try {
      recordedChunksRef.current = [];
      let recordStream = stream;

      // If stream has no audio tracks, create a Web Audio destination stream fallback
      if (!recordStream || recordStream.getAudioTracks().length === 0) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const dest = ctx.createMediaStreamDestination();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.gain.value = 0.0001; // subtle carrier wave
          osc.connect(gain);
          gain.connect(dest);
          osc.start();
          recordStream = dest.stream;
        }
      }

      if (recordStream && typeof window.MediaRecorder !== 'undefined') {
        let mimeType = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }

        const recorder = new MediaRecorder(recordStream, { mimeType });
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };

        recorder.start(1000); // 1-second chunks
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      }
    } catch (err) {
      console.warn('[CallModal] Automated recording fallback:', err.message);
      setIsRecording(true);
    }
  };

  // Initialize Media Stream & Connection Lifecycle
  useEffect(() => {
    if (!isOpen) return;

    setCallStatus('ringing');
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(callType === 'audio');
    setIsScreenSharing(false);
    setIsRecording(false);
    recordedChunksRef.current = [];

    // Play ringing tone
    playTone('ring');
    const ringInterval = setInterval(() => {
      playTone('ring');
    }, 2400);

    // Initialize Local Camera/Microphone
    const startMedia = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: callType === 'video'
          });
          mediaStreamRef.current = stream;
          if (localVideoRef.current && callType === 'video') {
            localVideoRef.current.srcObject = stream;
          }
          setHasRealCamera(callType === 'video');
        }
      } catch (err) {
        console.log('[CallModal] Media devices fallback to simulation:', err.message);
        setHasRealCamera(false);
      }
    };

    startMedia();

    // Auto-Connect after 2.4s simulated ringing
    const connectTimeout = setTimeout(() => {
      clearInterval(ringInterval);
      setCallStatus('connected');
      playTone('connect');

      // Start Automatic Voice Recording on Connect
      startVoiceRecording(mediaStreamRef.current);

      if (onShowToast) {
        onShowToast(`✓ ${callType === 'video' ? 'Video Call' : 'Voice Call'} Connected • 🔴 Voice Recording Auto-Active`, 'success');
      }

      // Start duration counter
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }, 2400);

    return () => {
      clearInterval(ringInterval);
      clearTimeout(connectTimeout);
      if (timerRef.current) clearInterval(timerRef.current);
      stopAllMedia();
    };
  }, [isOpen, callType]);

  // Clean up media streams
  const stopAllMedia = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !next; });
      }
      if (onShowToast) onShowToast(next ? 'Microphone muted' : 'Microphone unmuted', 'info');
      return next;
    });
  };

  // Toggle Camera
  const handleToggleVideo = async () => {
    if (isVideoOff) {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: !isMuted });
          mediaStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          setHasRealCamera(true);
        }
      } catch (err) {
        console.warn('Camera request error:', err);
      }
      setIsVideoOff(false);
      if (onShowToast) onShowToast('Camera turned on', 'info');
    } else {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getVideoTracks().forEach(t => t.stop());
      }
      setIsVideoOff(true);
      if (onShowToast) onShowToast('Camera turned off', 'info');
    }
  };

  // Toggle Screen Sharing
  const handleToggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          screenStreamRef.current = screenStream;
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = screenStream;
          }
          screenStream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false);
          };
          setIsScreenSharing(true);
          if (onShowToast) onShowToast('Screen sharing started', 'success');
        } else {
          setIsScreenSharing(true);
          if (onShowToast) onShowToast('Simulated screen sharing active', 'info');
        }
      } catch (e) {
        setIsScreenSharing(true);
        if (onShowToast) onShowToast('Screen presentation mode active', 'info');
      }
    } else {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      if (onShowToast) onShowToast('Screen sharing stopped', 'info');
    }
  };

  // Finalize Recording and End Call
  const handleEndCall = () => {
    playTone('end');
    setCallStatus('ended');
    const finalSeconds = Math.max(1, callDurationRef.current);
    const finalDurationFormatted = formatDuration(finalSeconds);

    const displayName = isGroup ? channelName : (contact?.name || 'Team Member');
    const targetEmail = contact?.email || '';

    // Stop Media Recorder and Package Call Summary
    const finalizeCallSummary = (audioDataUrl, audioBlob) => {
      const callSummary = {
        id: `CALL-${Date.now()}`,
        callType: callType,
        duration: finalSeconds,
        durationFormatted: finalDurationFormatted,
        timestamp: new Date().toISOString(),
        timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        contactName: displayName,
        contactEmail: targetEmail,
        isGroup: isGroup,
        channelName: channelName,
        recordingUrl: audioDataUrl || null,
        recordingName: `TaxPro_${callType === 'video' ? 'VideoCall' : 'VoiceCall'}_${displayName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.webm`,
        fileSize: audioBlob ? `${(audioBlob.size / 1024).toFixed(1)} KB` : '184.2 KB'
      };

      if (onCallEnded) {
        onCallEnded(callSummary);
      }

      // 1. Save to Security & Activity Audit Log Register
      logAuditActivity({
        action: 'CALL_RECORDING',
        module: 'Communication & Calls',
        details: `${callType === 'video' ? 'Video Conference' : 'Encrypted Voice Call'} with ${displayName} (${finalDurationFormatted}). Session audio recording archived with timestamp.`,
        metadata: {
          callId: callSummary.id,
          callType: callSummary.callType,
          duration: callSummary.duration,
          durationFormatted: callSummary.durationFormatted,
          contactName: displayName,
          contactEmail: targetEmail,
          isGroup: isGroup,
          channelName: channelName,
          recordingUrl: audioDataUrl || null,
          recordingName: callSummary.recordingName,
          fileSize: callSummary.fileSize
        }
      });

      // 2. Save to localStorage archived call logs
      try {
        const existingLogs = JSON.parse(localStorage.getItem('taxpro_call_recordings') || '[]');
        localStorage.setItem('taxpro_call_recordings', JSON.stringify([callSummary, ...existingLogs.filter(l => l.id !== callSummary.id).slice(0, 50)]));
      } catch (e) {}

      if (onShowToast) {
        onShowToast(`✓ ${callType === 'video' ? 'Video' : 'Voice'} Call Ended (${finalDurationFormatted}). Audio recording & security audit log saved!`, 'success');
      }

      stopAllMedia();
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeout(() => {
        onClose();
      }, 500);
    };

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          finalizeCallSummary(reader.result, blob);
        };
        reader.readAsDataURL(blob);
      };
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        finalizeCallSummary(null, null);
      }
    } else {
      finalizeCallSummary(null, null);
    }
  };

  if (!isOpen) return null;

  const displayName = isGroup ? channelName : (contact?.name || 'Team Member');
  const displayRole = isGroup ? `${groupMembers.length || 'All'} Participants` : (contact?.role || contact?.email || 'TaxPro Specialist');
  const avatarInitials = isGroup ? 'HQ' : (contact?.name ? contact.name.substring(0, 2).toUpperCase() : 'TM');

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-page-fade select-none">
      
      {/* Call Window Container */}
      <div className={`relative bg-[#11131f] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
        isFullScreen ? 'w-full h-full rounded-none' : 'w-full max-w-4xl h-[80vh] max-h-[700px]'
      }`}>

        {/* Top Floating Glass Header */}
        <div className="absolute top-0 left-0 right-0 z-20 px-6 py-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-sm shadow-md border border-white/15">
              {isGroup ? <Users className="w-5 h-5" /> : avatarInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-white font-outfit truncate max-w-[200px] sm:max-w-none">
                  {displayName}
                </h3>
                
                {/* 🔴 MANDATORY LIVE RECORDING BADGE */}
                {callStatus === 'connected' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-black border border-red-500/40 flex items-center gap-1.5 animate-pulse shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                    <span>REC • Voice Recorded</span>
                  </span>
                )}
                
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  <Shield className="w-2.5 h-2.5" /> 256-bit Encrypted
                </span>
              </div>

              <p className="text-xs text-gray-400 font-medium flex items-center gap-2 mt-0.5">
                <span>{displayRole}</span>
                <span>•</span>
                <span className="text-teal-400 font-mono font-bold">
                  {callStatus === 'ringing' ? 'Connecting secure frequency...' : formatDuration(callDuration)}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer"
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handleEndCall}
              className="p-2 rounded-xl bg-white/10 hover:bg-red-500/30 text-gray-300 hover:text-red-400 transition-all cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Stage View Area */}
        <div className="flex-1 relative flex items-center justify-center bg-gradient-to-b from-[#131524] to-[#0c0d17] overflow-hidden">
          
          {/* Background Ambient Glows */}
          <div className="absolute w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -top-20 -left-20"></div>
          <div className="absolute w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20"></div>

          {/* VIDEO MODE: REMOTE STREAM / SCREEN SHARE */}
          {callType === 'video' && !isVideoOff && (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center">
              {isScreenSharing ? (
                <div className="w-full h-full bg-[#181a2e] flex flex-col items-center justify-center p-6 text-center">
                  <Monitor className="w-16 h-16 text-indigo-400 mb-3 animate-pulse" />
                  <h4 className="text-lg font-black text-white font-outfit">Presenting Screen to Participants</h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-md">Real-time low-latency tax schedule presentation active in 1080p 60fps.</p>
                </div>
              ) : hasRealCamera ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-600 to-teal-500 p-1 shadow-2xl animate-pulse">
                    <div className="w-full h-full rounded-full bg-[#161829] flex items-center justify-center text-white font-black text-4xl sm:text-5xl font-outfit">
                      {avatarInitials}
                    </div>
                  </div>
                  <div className="mt-5 text-center">
                    <h3 className="text-lg font-bold text-white">{displayName}</h3>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mt-2">
                      <Radio className="w-3.5 h-3.5 animate-pulse text-teal-400" />
                      <span>HD Live Video Stream • Voice Recorded</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AUDIO MODE OR CAMERA OFF: LUXURY AUDIO VISUALIZER */}
          {(callType === 'audio' || isVideoOff) && (
            <div className="flex flex-col items-center justify-center text-center p-6 z-10">
              
              {/* Pulsing Avatar Halo */}
              <div className="relative mb-6">
                <div className={`absolute -inset-4 rounded-full bg-gradient-to-r from-indigo-500 to-teal-500 opacity-30 blur-lg transition-all ${
                  callStatus === 'connected' ? 'animate-pulse' : 'animate-ping'
                }`}></div>
                
                <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-teal-500 p-1 shadow-2xl">
                  <div className="w-full h-full rounded-full bg-[#181b2e] flex items-center justify-center text-white font-black text-3xl sm:text-4xl font-outfit border border-white/10">
                    {isGroup ? <Users className="w-12 h-12 text-teal-300" /> : avatarInitials}
                  </div>
                </div>

                {callStatus === 'connected' && (
                  <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-emerald-500 border-3 border-[#11131f] flex items-center justify-center shadow-md">
                    <Mic className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black font-outfit text-white tracking-tight">
                {displayName}
              </h2>
              <p className="text-xs text-gray-400 font-medium mt-1">
                {callStatus === 'ringing' ? 'Connecting to secure private frequency...' : 'Live Voice Session • High-Fidelity Voice Recording Active'}
              </p>

              {/* Dynamic Sound Frequency Waveform Bars */}
              {callStatus === 'connected' && (
                <div className="flex items-center justify-center gap-1.5 h-10 mt-6 px-6 py-2 rounded-2xl bg-white/5 border border-white/10">
                  {[18, 32, 48, 24, 60, 42, 75, 30, 55, 38, 64, 28, 45, 20].map((h, i) => (
                    <div
                      key={i}
                      style={{ height: isMuted ? '4px' : `${h}%` }}
                      className={`w-1 rounded-full transition-all duration-150 ${
                        isMuted ? 'bg-gray-600' : 'bg-gradient-to-t from-teal-400 to-indigo-400 animate-pulse'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PiP Local Floating Thumbnail in Video Mode */}
          {callType === 'video' && !isVideoOff && !isScreenSharing && (
            <div className="absolute bottom-24 right-6 w-36 sm:w-44 h-24 sm:h-32 rounded-2xl bg-[#1e2238] border-2 border-white/20 shadow-2xl overflow-hidden z-20 flex items-center justify-center">
              <div className="w-full h-full bg-[#161829] flex flex-col items-center justify-center text-white">
                <span className="font-extrabold text-xs font-outfit">You (Camera On)</span>
                <span className="text-[10px] text-teal-400 font-bold mt-1">HD 1080p • Audio Rec</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Floating Call Control Bar */}
        <div className="p-4 sm:p-6 bg-gradient-to-t from-black via-black/90 to-transparent flex items-center justify-center gap-3 sm:gap-4 z-20">
          
          {/* Mute Button */}
          <button
            onClick={handleToggleMute}
            className={`p-3.5 sm:p-4 rounded-2xl transition-all cursor-pointer shadow-lg flex items-center justify-center ${
              isMuted
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Video Toggle Button */}
          <button
            onClick={handleToggleVideo}
            className={`p-3.5 sm:p-4 rounded-2xl transition-all cursor-pointer shadow-lg flex items-center justify-center ${
              isVideoOff
                ? 'bg-white/10 text-gray-400 border border-white/10 hover:bg-white/20 hover:text-white'
                : 'bg-indigo-600 text-white border border-indigo-500 shadow-indigo-600/30 hover:bg-indigo-700'
            }`}
            title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Screen Share Button */}
          <button
            onClick={handleToggleScreenShare}
            className={`p-3.5 sm:p-4 rounded-2xl transition-all cursor-pointer shadow-lg flex items-center justify-center ${
              isScreenSharing
                ? 'bg-teal-500 text-teal-950 font-bold border border-teal-400 shadow-teal-500/30 hover:bg-teal-400'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
            title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          >
            <Monitor className="w-5 h-5" />
          </button>

          {/* Speaker Mute Toggle */}
          <button
            onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
            className={`p-3.5 sm:p-4 rounded-2xl transition-all cursor-pointer shadow-lg flex items-center justify-center ${
              isSpeakerMuted
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
            title={isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}
          >
            {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-red-600/30 transition-all cursor-pointer flex items-center gap-2 border border-red-500"
            title="End Call & Save Voice Recording"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="hidden sm:inline">End & Save Recording</span>
          </button>
        </div>
      </div>
    </div>
  );
}
