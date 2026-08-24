import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, 
  Search, 
  CheckCheck, 
  Smile, 
  Paperclip, 
  MoreVertical, 
  Phone, 
  Video, 
  Users, 
  Circle, 
  RefreshCw, 
  MessageSquare,
  X,
  FileText,
  Download,
  Image as ImageIcon,
  ExternalLink,
  Eye,
  FileCode,
  FileSpreadsheet,
  Play,
  Pause,
  Volume2,
  FileAudio,
  ShieldCheck,
  Disc,
  Palette,
  Check,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import CallModal from './CallModal';

// Role Dot Indicator Presets & Defaults
export const DEFAULT_ROLE_DOTS = {
  admin: { color: '#ef4444', label: 'Admin (🔴 Red)', roleName: 'Admin' },
  manager: { color: '#3b82f6', label: 'Manager (🔵 Blue)', roleName: 'Manager' },
  other: { color: '#10b981', label: 'Other Chat (Customizable)', roleName: 'Staff / Other' }
};

export const PRESET_OTHER_COLORS = [
  { id: 'emerald', name: 'Emerald Green', hex: '#10b981' },
  { id: 'purple', name: 'Royal Purple', hex: '#8b5cf6' },
  { id: 'amber', name: 'Golden Amber', hex: '#f59e0b' },
  { id: 'orange', name: 'Vibrant Orange', hex: '#f97316' },
  { id: 'cyan', name: 'Sky Cyan', hex: '#06b6d4' },
  { id: 'pink', name: 'Rose Pink', hex: '#ec4899' },
  { id: 'indigo', name: 'Deep Indigo', hex: '#6366f1' },
  { id: 'teal', name: 'Teal Green', hex: '#14b8a6' },
  { id: 'slate', name: 'Slate Gray', hex: '#64748b' },
  { id: 'lime', name: 'Electric Lime', hex: '#84cc16' }
];

export const resolveRoleCategory = (userOrRole) => {
  if (!userOrRole) return { category: 'other', label: 'Staff / Other', roleName: 'Team Member' };
  const str = typeof userOrRole === 'string' ? userOrRole : (userOrRole.role || userOrRole.senderRole || userOrRole.email || '');
  const s = str.toLowerCase();
  if (s.includes('admin') || s.includes('managing partner') || s.includes('principal')) {
    return { category: 'admin', label: 'Admin', roleName: 'Admin' };
  }
  if (s.includes('manager') || s.includes('director') || s.includes('cfo') || s.includes('lead') || s.includes('vp') || s.includes('head')) {
    return { category: 'manager', label: 'Manager', roleName: 'Manager' };
  }
  return { category: 'other', label: 'Staff', roleName: typeof userOrRole === 'object' && userOrRole.role ? userOrRole.role : 'Team Member' };
};

export const getRoleDotColor = (category, dotSettings) => {
  if (dotSettings?.[category]?.color) return dotSettings[category].color;
  if (category === 'admin') return '#ef4444';
  if (category === 'manager') return '#3b82f6';
  return dotSettings?.other?.color || '#10b981';
};

// Helper to format file sizes
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Helper to parse message content (safely handles plain text, attachments, and recorded calls)
const parseMessagePayload = (rawContent) => {
  if (!rawContent) return { text: '', attachment: null, callData: null };
  if (typeof rawContent === 'object') {
    return {
      text: rawContent.text || '',
      attachment: rawContent.attachment || null,
      callData: rawContent.callData || null
    };
  }
  if (typeof rawContent === 'string' && rawContent.startsWith('{"__taxproMsg":true')) {
    try {
      const parsed = JSON.parse(rawContent);
      return {
        text: parsed.text || '',
        attachment: parsed.attachment || null,
        callData: parsed.callData || null
      };
    } catch (e) {
      return { text: rawContent, attachment: null, callData: null };
    }
  }
  return { text: rawContent, attachment: null, callData: null };
};

// Interactive In-Message Audio Player Component for Recorded Calls
function InMessageAudioPlayer({ callData, isMe }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.log('Audio playback error:', err);
      });
    }
  };

  return (
    <div className={`p-3 sm:p-4 rounded-2xl border shadow-sm ${
      isMe 
        ? 'bg-white/10 border-white/20 text-white' 
        : 'bg-indigo-50/60 border-indigo-200 text-gray-900'
    }`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
            isMe ? 'bg-white/20 text-white' : 'bg-indigo-600 text-white'
          }`}>
            {callData.callType === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
          </div>
          <div>
            <div className="text-xs font-black font-outfit flex items-center gap-1.5">
              <span>{callData.callType === 'video' ? 'Recorded Video Call' : 'Recorded Voice Call'}</span>
              <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                <Disc className="w-2.5 h-2.5 animate-spin" /> Voice Audio
              </span>
            </div>
            <div className="text-[10px] opacity-75 font-mono">
              Duration: {callData.durationFormatted || '00:00'} • {callData.fileSize || 'Audio File'}
            </div>
          </div>
        </div>

        {callData.recordingUrl && (
          <a
            href={callData.recordingUrl}
            download={callData.recordingName || 'call_recording.webm'}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'
            }`}
            title="Download Call Audio"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {callData.recordingUrl ? (
        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          <button
            onClick={togglePlay}
            className={`p-2 rounded-xl flex items-center justify-center transition-transform active:scale-95 cursor-pointer ${
              isMe ? 'bg-white text-indigo-900 shadow-sm' : 'bg-[#5b52e0] text-white shadow-sm'
            }`}
            title={isPlaying ? 'Pause Audio' : 'Play Voice Recording'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>

          <audio
            ref={audioRef}
            src={callData.recordingUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />

          <div className="flex-1 flex items-center gap-1 h-6 px-2 bg-black/10 rounded-lg">
            <div className="flex items-center gap-1 flex-1">
              {[30, 60, 45, 80, 55, 90, 70, 40, 65, 85, 50, 75, 35, 60].map((h, idx) => (
                <div
                  key={idx}
                  style={{ height: `${h}%` }}
                  className={`w-1 rounded-full ${
                    isPlaying 
                      ? 'bg-teal-400 animate-pulse' 
                      : isMe ? 'bg-white/40' : 'bg-indigo-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] font-mono font-bold">{callData.durationFormatted}</span>
          </div>
        </div>
      ) : (
        <div className="pt-2 text-[10px] opacity-75 italic flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>Voice call encrypted & audit logged in practice records.</span>
        </div>
      )}
    </div>
  );
}

export default function PrivateChatView({ onShowToast, preSelectedUser }) {
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [selectedAttachment, setSelectedAttachment] = useState(null); // { name, type, size, dataUrl }
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Chat Role Dot Indicator Settings (Admin=Red, Manager=Blue, Other=Customizable)
  const [dotSettings, setDotSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('taxpro_chat_dot_colors');
      if (cached) {
        return { ...DEFAULT_ROLE_DOTS, ...JSON.parse(cached) };
      }
    } catch (e) {}
    return DEFAULT_ROLE_DOTS;
  });
  const [tempDotSettings, setTempDotSettings] = useState(DEFAULT_ROLE_DOTS);
  const [isDotSettingsModalOpen, setIsDotSettingsModalOpen] = useState(false);

  // Save Dot Settings to localStorage & sync
  const saveDotSettings = (newSettings) => {
    setDotSettings(newSettings);
    try {
      localStorage.setItem('taxpro_chat_dot_colors', JSON.stringify(newSettings));
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('taxpro_dot_colors_updated', { detail: newSettings }));
  };

  // Sync dot settings across tabs
  useEffect(() => {
    const handleDotUpdate = (e) => {
      if (e.detail) setDotSettings(e.detail);
    };
    window.addEventListener('taxpro_dot_colors_updated', handleDotUpdate);
    return () => window.removeEventListener('taxpro_dot_colors_updated', handleDotUpdate);
  }, []);
  
  // Call State
  const [callModalState, setCallModalState] = useState({ isOpen: false, callType: 'audio' });

  // Lightbox Image Preview Modal
  const [previewImage, setPreviewImage] = useState(null);

  const messagesEndRef = useRef(null);
  const activeContactRef = useRef(activeContact);
  const fileInputRef = useRef(null);

  // Keep ref synchronized for interval callback
  useEffect(() => {
    activeContactRef.current = activeContact;
  }, [activeContact]);

  // Current logged in user info
  const currentUserEmail = (localStorage.getItem('taxpro_user_email') || 'admin@taxpro.com').toLowerCase().trim();
  const currentUserName = localStorage.getItem('taxpro_user_name') || 'Administrator';
  const userRole = (localStorage.getItem('taxpro_user_role') || 'admin').toLowerCase();
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  // 1. Fetch all contacts from PostgreSQL SQL
  const fetchContacts = useCallback(async (silent = false) => {
    if (!silent) setIsLoadingContacts(true);
    try {
      const res = await fetch(`${baseUrl}/api/chat/contacts?currentUserEmail=${encodeURIComponent(currentUserEmail)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.contacts)) {
        // Filter out current user from chatting with themselves unless they are the only user
        const otherContacts = data.contacts.filter(c => (c.email || '').toLowerCase().trim() !== currentUserEmail);
        const finalList = otherContacts.length > 0 ? otherContacts : data.contacts;
        setContacts(finalList);

        // If preSelectedUser provided, select them
        if (preSelectedUser) {
          const match = finalList.find(c => 
            (c.name && c.name.toLowerCase() === preSelectedUser.name?.toLowerCase()) ||
            (c.email && c.email.toLowerCase() === preSelectedUser.email?.toLowerCase())
          );
          if (match) {
            setActiveContact(match);
          } else if (!activeContactRef.current && finalList.length > 0) {
            setActiveContact(finalList[0]);
          }
        } else if (!activeContactRef.current && finalList.length > 0) {
          setActiveContact(finalList[0]);
        }
      }
    } catch (err) {
      console.error('[PrivateChat] Contacts fetch error:', err.message);
    } finally {
      if (!silent) setIsLoadingContacts(false);
    }
  }, [baseUrl, currentUserEmail, preSelectedUser]);

  // 2. Fetch messages for active contact from PostgreSQL SQL
  const fetchMessages = useCallback(async (contact, silent = false) => {
    if (!contact || !contact.email) return;
    if (!silent) setIsLoadingMessages(true);
    try {
      const res = await fetch(
        `${baseUrl}/api/chat/private?user1=${encodeURIComponent(currentUserEmail)}&user2=${encodeURIComponent(contact.email)}`
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('[PrivateChat] Messages fetch error:', err.message);
    } finally {
      if (!silent) setIsLoadingMessages(false);
    }
  }, [baseUrl, currentUserEmail]);

  // Initial load
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // When activeContact changes, fetch their message history
  useEffect(() => {
    if (activeContact) {
      fetchMessages(activeContact);
    }
  }, [activeContact, fetchMessages]);

  // 3. Multi-Device Real-Time Polling Engine & Instant Event Sync
  useEffect(() => {
    const interval = setInterval(() => {
      fetchContacts(true);
      if (activeContactRef.current) {
        fetchMessages(activeContactRef.current, true);
      }
    }, 5000);

    const handleInstantChat = () => {
      fetchContacts(true);
      if (activeContactRef.current) {
        fetchMessages(activeContactRef.current, true);
      }
    };
    window.addEventListener('taxpro_private_chat_sent', handleInstantChat);

    return () => {
      clearInterval(interval);
      window.removeEventListener('taxpro_private_chat_sent', handleInstantChat);
    };
  }, [fetchContacts, fetchMessages]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedAttachment]);

  // Handle File Selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      if (onShowToast) onShowToast('File too large. Please select an attachment under 15MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedAttachment({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: formatFileSize(file.size),
        dataUrl: event.target.result
      });
      if (onShowToast) onShowToast(`✓ Attached ${file.name} (${formatFileSize(file.size)})`, 'info');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 4. Send Message Handler
  const handleSend = async (e) => {
    e?.preventDefault();
    const text = inputMsg.trim();
    if ((!text && !selectedAttachment) || !activeContact || isSending) return;

    setIsSending(true);
    setInputMsg('');
    const currentAttachment = selectedAttachment;
    setSelectedAttachment(null);

    // Package payload with attachment metadata if present
    const payloadContent = currentAttachment
      ? JSON.stringify({
          __taxproMsg: true,
          text: text,
          attachment: currentAttachment
        })
      : text;

    // Optimistic UI update
    const optimisticMsg = {
      id: `OPT-${Date.now()}`,
      text: payloadContent,
      senderId: currentUserEmail,
      senderName: currentUserName,
      receiverId: activeContact.email,
      receiverName: activeContact.name,
      isMe: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      read: false
    };

    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`${baseUrl}/api/chat/private`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: currentUserEmail,
          sender_name: currentUserName,
          receiver_id: activeContact.email,
          receiver_name: activeContact.name,
          content: payloadContent
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to deliver message.');
      }

      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data.message : m));
      fetchContacts(true);
    } catch (err) {
      if (onShowToast) onShowToast(`Message delivery failed: ${err.message}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Handle Call Ended & Auto-Post Recorded Voice Call Log to Chat
  const handleCallEnded = async (callSummary) => {
    if (!activeContact) return;

    const callPayload = JSON.stringify({
      __taxproMsg: true,
      text: `📞 ${callSummary.callType === 'video' ? 'Recorded Video Call' : 'Recorded Voice Call'} (${callSummary.durationFormatted})`,
      callData: callSummary
    });

    const optimisticMsg = {
      id: `CALL-MSG-${Date.now()}`,
      text: callPayload,
      senderId: currentUserEmail,
      senderName: currentUserName,
      receiverId: activeContact.email,
      receiverName: activeContact.name,
      isMe: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      read: false
    };

    setMessages(prev => [...prev, optimisticMsg]);

    try {
      await fetch(`${baseUrl}/api/chat/private`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: currentUserEmail,
          sender_name: currentUserName,
          receiver_id: activeContact.email,
          receiver_name: activeContact.name,
          content: callPayload
        })
      });
      fetchContacts(true);
    } catch (e) {
      console.warn('Call recording post error:', e);
    }
  };

  // Trigger Audio Call
  const handleStartAudioCall = () => {
    if (!activeContact) return;
    setCallModalState({ isOpen: true, callType: 'audio' });
  };

  // Trigger Video Call
  const handleStartVideoCall = () => {
    if (!activeContact) return;
    setCallModalState({ isOpen: true, callType: 'video' });
  };

  // Filter contacts by search query
  const filteredContacts = contacts.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.role && c.role.toLowerCase().includes(q)) ||
      (c.department && c.department.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex h-[calc(100vh-60px)] bg-[#f3f4f6] relative">
      
      {/* Hidden File Input for Attachments */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
        className="hidden"
      />

      {/* CALL MODAL (AUDIO / VIDEO WITH VOICE RECORDING) */}
      <CallModal
        isOpen={callModalState.isOpen}
        onClose={() => setCallModalState({ isOpen: false, callType: 'audio' })}
        callType={callModalState.callType}
        contact={activeContact}
        isGroup={false}
        onCallEnded={handleCallEnded}
        onShowToast={onShowToast}
      />

      {/* LIGHTBOX FULLSCREEN IMAGE PREVIEW */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-page-fade"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewImage.dataUrl}
              alt={previewImage.name}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
            <div className="mt-3 flex items-center justify-between w-full text-white text-xs px-2" onClick={e => e.stopPropagation()}>
              <span className="font-bold truncate">{previewImage.name}</span>
              <a
                href={previewImage.dataUrl}
                download={previewImage.name}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </a>
            </div>
          </div>
        </div>
      )}
      
      {/* Sidebar - Contact List */}
      <div className="w-80 sm:w-88 bg-white border-r border-gray-200 flex flex-col h-full shadow-xs flex-shrink-0">
        <div className="p-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-extrabold text-gray-900 font-outfit">Direct Messages</h2>
            </div>
            <button 
              onClick={() => fetchContacts()} 
              title="Refresh Members & Messages"
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingContacts ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search team members..." 
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500 transition-colors focus:bg-white text-gray-800"
            />
          </div>
        </div>

        {/* Contacts Scrollable List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoadingContacts && contacts.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs font-medium flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
              Loading team directory from database...
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs font-medium">
              {searchQuery ? 'No members match your search.' : 'No team members registered yet.'}
            </div>
          ) : (
            filteredContacts.map(c => {
              const isSelected = activeContact?.email === c.email;
              const roleInfo = resolveRoleCategory(c);
              const dotColor = getRoleDotColor(roleInfo.category, dotSettings);

              return (
                <button
                  key={c.id || c.email}
                  onClick={() => setActiveContact(c)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left cursor-pointer ${
                    isSelected 
                      ? 'bg-indigo-50/80 border-indigo-200 shadow-xs' 
                      : 'bg-transparent border-transparent hover:bg-gray-50'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-xs shadow-xs">
                      {c.avatar || (c.name ? c.name.substring(0, 2).toUpperCase() : 'TM')}
                    </div>
                    {/* Upper Role Dot on Avatar */}
                    <span 
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm flex items-center justify-center z-10"
                      style={{ backgroundColor: dotColor }}
                      title={`${roleInfo.label}: ${c.name}`}
                    >
                      <span className="w-1 h-1 rounded-full bg-white/90" />
                    </span>
                    {c.online && (
                      <div className="absolute right-0 bottom-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span 
                          className="w-2 h-2 rounded-full shrink-0" 
                          style={{ backgroundColor: dotColor }}
                        />
                        <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                          {c.name}
                        </h4>
                      </div>
                      {c.lastMessage?.time && (
                        <span className="text-[10px] text-gray-400 font-semibold shrink-0">{c.lastMessage.time}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[11px] text-gray-500 font-medium truncate flex-1">
                        {c.lastMessage?.text ? (c.lastMessage.text.startsWith('{') ? '📎 Attachment / Recorded Call' : c.lastMessage.text) : `${c.role} • ${c.department || 'General'}`}
                      </p>
                      {c.unreadCount > 0 && (
                        <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded-full text-[10px] font-extrabold flex-shrink-0">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Current User Badge Footer */}
        <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              {currentUserName.substring(0, 2).toUpperCase()}
            </div>
            <span 
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white shadow-2xs"
              style={{ backgroundColor: getRoleDotColor(userRole.includes('admin') ? 'admin' : userRole.includes('manager') ? 'manager' : 'other', dotSettings) }}
              title="Your Upper Role Dot"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">{currentUserName} <span className="text-[10px] text-gray-400 font-normal">(You)</span></p>
            <p className="text-[10px] text-emerald-600 font-semibold truncate flex items-center gap-1">
              <Circle className="w-1.5 h-1.5 fill-emerald-500 text-emerald-500" /> PostgreSQL Synced
            </p>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      {activeContact ? (
        <div className="flex-1 flex flex-col bg-white min-w-0">
          {/* Header */}
          {(() => {
            const activeRoleInfo = resolveRoleCategory(activeContact);
            const activeDotColor = getRoleDotColor(activeRoleInfo.category, dotSettings);

            return (
              <div className="h-16 border-b border-gray-100 flex flex-shrink-0 items-center justify-between px-6 bg-gray-50/60 flex-wrap gap-2">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-sm shadow-xs">
                      {activeContact.avatar || activeContact.name?.substring(0, 2).toUpperCase()}
                    </div>
                    {/* Upper Role Dot */}
                    <span 
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm flex items-center justify-center z-10"
                      style={{ backgroundColor: activeDotColor }}
                      title={`${activeRoleInfo.label} (${activeRoleInfo.roleName})`}
                    >
                      <span className="w-1 h-1 rounded-full bg-white/90 animate-pulse" />
                    </span>
                    {activeContact.online && (
                      <div className="absolute right-0 bottom-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-gray-900 text-sm truncate flex items-center gap-2">
                      <span>{activeContact.name}</span>
                      <span 
                        className="text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase border shadow-2xs"
                        style={{
                          backgroundColor: `${activeDotColor}15`,
                          borderColor: `${activeDotColor}40`,
                          color: activeDotColor
                        }}
                      >
                        {activeRoleInfo.roleName}
                      </span>
                    </h3>
                    <p className="text-[11px] text-gray-500 font-medium truncate">
                      {activeContact.email} • <span className="text-emerald-600 font-bold">{activeContact.online ? 'Online' : 'Active Member'}</span>
                    </p>
                  </div>
                </div>
                
                {/* CALLING & DOT OPTIONS BUTTONS */}
                <div className="flex items-center gap-2 text-gray-500 flex-shrink-0">
                  
                  {/* Dot Color Customizer Trigger */}
                  <button
                    type="button"
                    onClick={() => {
                      setTempDotSettings({ ...dotSettings });
                      setIsDotSettingsModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-indigo-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                    title="Customize role dot colors"
                  >
                    <Palette className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="hidden sm:inline">Dot Options</span>
                  </button>

                  <button 
                    onClick={() => fetchMessages(activeContact)}
                    title="Sync Messages"
                    className="p-2 hover:bg-gray-100 rounded-full hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingMessages ? 'animate-spin text-indigo-600' : ''}`} />
                  </button>
                  
                  {/* VOICE AUDIO CALL BUTTON (AUTO RECORDED) */}
                  <button 
                    onClick={handleStartAudioCall}
                    title={`Start Recorded Voice Call with ${activeContact.name}`}
                    className="p-2.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 rounded-full transition-all cursor-pointer shadow-2xs"
                  >
                    <Phone className="w-4 h-4" />
                  </button>

                  {/* HD VIDEO CALL BUTTON (AUTO RECORDED) */}
                  <button 
                    onClick={handleStartVideoCall}
                    title={`Start Recorded Video Call with ${activeContact.name}`}
                    className="p-2.5 bg-teal-50 hover:bg-teal-600 hover:text-white text-teal-700 rounded-full transition-all cursor-pointer shadow-2xs"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Message Thread - Side Alignment: Our Chat = Right, Other Chat = Left */}
          <div className="flex-1 overflow-y-auto p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-gray-50/20 flex flex-col gap-4">
            {isLoadingMessages && messages.length === 0 ? (
              <div className="text-center w-full my-auto text-gray-400 text-xs font-semibold flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                Loading conversation from database...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center w-full my-auto text-gray-400 text-xs font-semibold max-w-sm mx-auto p-6 bg-white border border-gray-100 rounded-2xl shadow-xs">
                <Users className="w-8 h-8 text-indigo-300 mx-auto mb-2" />
                This is the start of your secure direct conversation with <strong className="text-gray-700">{activeContact.name}</strong>.
                <p className="text-[11px] text-gray-400 mt-1">Send text, attachments, or start an audio/video call (Voice Recorded).</p>
              </div>
            ) : (
              messages.map(msg => {
                const { text, attachment, callData } = parseMessagePayload(msg.text);
                const isImage = attachment?.type?.startsWith('image/') || (attachment?.dataUrl && attachment.dataUrl.startsWith('data:image'));
                
                // Sender role dot resolution
                const senderRoleInfo = msg.isMe 
                  ? resolveRoleCategory(userRole) 
                  : resolveRoleCategory(activeContact);
                const senderDotColor = getRoleDotColor(senderRoleInfo.category, dotSettings);

                return (
                  <div 
                    key={msg.id} 
                    className={`w-full flex transition-all ${msg.isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2.5 max-w-md sm:max-w-lg ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      
                      {/* Avatar with Upper Dot */}
                      <div className="relative shrink-0 self-start mt-0.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-2xs ${
                          msg.isMe ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {msg.isMe ? currentUserName.substring(0, 2).toUpperCase() : (activeContact.name ? activeContact.name.substring(0, 2).toUpperCase() : 'TM')}
                        </div>
                        <span 
                          className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white shadow-xs z-10"
                          style={{ backgroundColor: senderDotColor }}
                          title={`${senderRoleInfo.label}: ${msg.isMe ? 'You' : activeContact.name}`}
                        />
                      </div>

                      {/* Bubble Container */}
                      <div className={`flex flex-col min-w-0 ${msg.isMe ? 'items-end' : 'items-start'}`}>
                        
                        {/* Header with Dot & Role Pill */}
                        <div className={`flex items-center gap-1.5 mb-1 px-1 ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          <span 
                            className="w-2 h-2 rounded-full ring-1 ring-white"
                            style={{ backgroundColor: senderDotColor }}
                          />
                          <span className="text-[10px] font-bold text-gray-700">
                            {msg.isMe ? 'You' : activeContact.name}
                          </span>
                          <span 
                            className="px-1.5 py-0.1 rounded text-[8px] font-extrabold uppercase border"
                            style={{
                              backgroundColor: `${senderDotColor}15`,
                              borderColor: `${senderDotColor}40`,
                              color: senderDotColor
                            }}
                          >
                            {senderRoleInfo.roleName}
                          </span>
                        </div>

                        {/* Speech Bubble */}
                        <div className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm shadow-xs relative group ${
                          msg.isMe 
                            ? 'bg-[#5b52e0] text-white rounded-tr-xs text-left' 
                            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-xs text-left'
                        }`}>
                          
                          {/* 1. RECORDED CALL LOG RENDERING */}
                          {callData && (
                            <div className="mb-2">
                              <InMessageAudioPlayer callData={callData} isMe={msg.isMe} />
                            </div>
                          )}

                          {/* 2. ATTACHMENT RENDERING */}
                          {attachment && (
                            <div className="mb-2">
                              {isImage ? (
                                <div className="relative rounded-xl overflow-hidden border border-white/20 shadow-md group/img cursor-pointer max-w-xs">
                                  <img
                                    src={attachment.dataUrl}
                                    alt={attachment.name}
                                    onClick={() => setPreviewImage(attachment)}
                                    className="w-full max-h-56 object-cover hover:scale-105 transition-transform duration-200"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewImage(attachment)}
                                      className="p-1.5 rounded-lg bg-white/80 text-gray-900 hover:bg-white text-xs font-bold flex items-center gap-1"
                                    >
                                      <Eye className="w-3.5 h-3.5" /> View
                                    </button>
                                    <a
                                      href={attachment.dataUrl}
                                      download={attachment.name}
                                      onClick={e => e.stopPropagation()}
                                      className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </div>
                              ) : (
                                <div className={`p-3 rounded-xl flex items-center gap-3 border ${
                                  msg.isMe ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                                }`}>
                                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                    msg.isMe ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600'
                                  }`}>
                                    {attachment.name?.endsWith('.xlsx') || attachment.name?.endsWith('.csv') ? (
                                      <FileSpreadsheet className="w-5 h-5" />
                                    ) : (
                                      <FileText className="w-5 h-5" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 text-left">
                                    <div className="font-bold text-xs truncate">{attachment.name}</div>
                                    <div className="text-[10px] opacity-75 font-mono">{attachment.size}</div>
                                  </div>
                                  <a
                                    href={attachment.dataUrl}
                                    download={attachment.name}
                                    className={`p-2 rounded-lg transition-colors shrink-0 ${
                                      msg.isMe ? 'hover:bg-white/20 text-white' : 'hover:bg-indigo-50 text-indigo-600'
                                    }`}
                                    title="Download Attachment"
                                  >
                                    <Download className="w-4 h-4" />
                                  </a>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 3. TEXT CONTENT */}
                          {text && <p className="leading-relaxed whitespace-pre-wrap">{text}</p>}

                          <div className={`flex items-center gap-1 mt-1 justify-end ${msg.isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                            <span className="text-[9px] font-semibold">{msg.time}</span>
                            {msg.isMe && <CheckCheck className="w-3 h-3 text-indigo-200" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ACTIVE ATTACHMENT PREVIEW BAR */}
          {selectedAttachment && (
            <div className="px-4 py-2 bg-indigo-50/80 border-t border-indigo-100 flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2.5 min-w-0">
                {selectedAttachment.type?.startsWith('image/') ? (
                  <img
                    src={selectedAttachment.dataUrl}
                    alt="Preview"
                    className="w-8 h-8 rounded-lg object-cover border border-indigo-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-indigo-200 text-indigo-800 flex items-center justify-center font-bold text-xs">
                    <FileText className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-xs font-bold text-indigo-950 truncate block">
                    {selectedAttachment.name}
                  </span>
                  <span className="text-[10px] text-indigo-600 font-mono">
                    {selectedAttachment.size} • Ready to send
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAttachment(null)}
                className="p-1 rounded-lg hover:bg-indigo-200 text-indigo-700 transition-colors cursor-pointer"
                title="Remove Attachment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Input Section */}
          <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
            <form onSubmit={handleSend} className="flex items-center gap-3">
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                title="Attach Document or Image"
                className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all rounded-full shrink-0 cursor-pointer"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  value={inputMsg}
                  onChange={e => setInputMsg(e.target.value)}
                  placeholder={`Write a message to ${activeContact.name}...`}
                  className="w-full bg-gray-50 border border-gray-200 rounded-full px-5 py-2.5 text-xs sm:text-sm outline-none focus:border-indigo-500 transition-colors pr-10 focus:bg-white text-gray-800 font-medium"
                />
              </div>

              <button 
                type="submit" 
                disabled={(!inputMsg.trim() && !selectedAttachment) || isSending}
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform cursor-pointer ${
                  (inputMsg.trim() || selectedAttachment) && !isSending ? 'bg-[#5b52e0] text-white shadow-md hover:scale-105 hover:bg-[#4c44cf]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send className={`w-4 h-4 ${inputMsg.trim() ? 'ml-0.5' : ''}`} />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white gap-4">
          <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-400 border-4 border-indigo-100/50">
            <Send className="w-7 h-7 ml-1" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-gray-800">Private Direct Messages</h3>
            <p className="text-xs text-gray-500 font-medium max-w-sm mt-1">
              Select a team member from the directory on the left to start a real-time conversation, send attachments, or start an audio/video call with automatic voice recording.
            </p>
          </div>
        </div>
      )}

      {/* DOT COLOR CUSTOMIZER MODAL */}
      {isDotSettingsModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsDotSettingsModalOpen(false); }}
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col animate-scale-up max-h-[92vh]">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-xs">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-white tracking-tight">
                    Chat Role Dot Colors & Recognition
                  </h3>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    Customize upper dot indicators on chat avatars and messages
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsDotSettingsModalOpen(false)} 
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer shadow-xs"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex flex-col gap-5 text-xs font-semibold scrollbar-thin">
              
              {/* Standard Active Indicators */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col gap-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Standard Active Indicators</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Admin Dot Card */}
                  <div className="p-3 bg-white rounded-xl border border-red-100 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-red-500 ring-2 ring-red-200 shadow-xs flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      </span>
                      <div>
                        <div className="font-bold text-gray-900 text-xs">Admin Chat</div>
                        <div className="text-[10px] text-red-600 font-bold">🔴 Red Dot (Upper of Admin)</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 text-[10px] font-extrabold uppercase">
                      Admin
                    </span>
                  </div>

                  {/* Manager Dot Card */}
                  <div className="p-3 bg-white rounded-xl border border-blue-100 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-blue-500 ring-2 ring-blue-200 shadow-xs flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      </span>
                      <div>
                        <div className="font-bold text-gray-900 text-xs">Manager Chat</div>
                        <div className="text-[10px] text-blue-600 font-bold">🔵 Blue Dot (Upper of Manager)</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold uppercase">
                      Manager
                    </span>
                  </div>
                </div>
              </div>

              {/* Option for Other Chat Dot Color */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 flex flex-col gap-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-xs font-black text-indigo-950 font-outfit flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Option for Other Chat Dot Color</span>
                    </h4>
                    <p className="text-[11px] text-indigo-700 font-medium mt-0.5">
                      Pick a vibrant color for other team members to recognize them easily in chat
                    </p>
                  </div>

                  {/* Current Active Dot Preview */}
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-xl border border-indigo-200 shadow-2xs">
                    <span 
                      className="w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-xs" 
                      style={{ backgroundColor: tempDotSettings.other?.color || '#10b981' }} 
                    />
                    <span className="text-[11px] font-bold text-gray-800">
                      {PRESET_OTHER_COLORS.find(c => c.hex.toLowerCase() === (tempDotSettings.other?.color || '#10b981').toLowerCase())?.name || 'Custom Color'}
                    </span>
                  </div>
                </div>

                {/* Quick Swatches */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {PRESET_OTHER_COLORS.map(c => {
                    const isSelected = (tempDotSettings.other?.color || '#10b981').toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setTempDotSettings(prev => ({
                          ...prev,
                          other: { ...prev.other, color: c.hex, label: 'Staff / Other', roleName: 'Team Member' }
                        }))}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/30 shadow-xs scale-102' 
                            : 'bg-white/70 border-gray-200 hover:bg-white hover:border-gray-300'
                        }`}
                      >
                        <span 
                          className="w-5 h-5 rounded-full ring-2 ring-white shadow-xs flex items-center justify-center"
                          style={{ backgroundColor: c.hex }}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </span>
                        <span className="text-[10px] font-bold text-gray-800 truncate w-full text-center">{c.name.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Color Input */}
                <div className="flex items-center gap-3 pt-2 border-t border-indigo-100">
                  <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5 cursor-pointer">
                    <span>Or choose custom color:</span>
                    <input
                      type="color"
                      value={tempDotSettings.other?.color || '#10b981'}
                      onChange={(e) => setTempDotSettings(prev => ({
                        ...prev,
                        other: { ...prev.other, color: e.target.value }
                      }))}
                      className="w-7 h-7 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white"
                    />
                  </label>
                  <span className="text-[11px] font-mono text-gray-500 uppercase font-bold">
                    {tempDotSettings.other?.color || '#10b981'}
                  </span>
                </div>
              </div>

            </div>

            {/* Footer Controls */}
            <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setTempDotSettings(DEFAULT_ROLE_DOTS)}
                className="px-3.5 py-2 rounded-xl border border-gray-300 hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDotSettingsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    saveDotSettings(tempDotSettings);
                    setIsDotSettingsModalOpen(false);
                    if (onShowToast) onShowToast('✓ Chat dot color preferences saved!', 'success');
                  }}
                  className="px-5 py-2 bg-[#5b52e0] hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply Preferences</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
