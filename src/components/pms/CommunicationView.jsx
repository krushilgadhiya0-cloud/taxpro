import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  MessageSquare, 
  Send, 
  Users, 
  Circle, 
  MoreVertical, 
  Search, 
  Paperclip, 
  Smile, 
  RefreshCw,
  Phone,
  Video,
  X,
  FileText,
  Download,
  Eye,
  FileSpreadsheet,
  Radio,
  Sparkles,
  Play,
  Pause,
  Disc,
  ShieldCheck,
  Megaphone,
  Pin,
  CheckCheck,
  Plus,
  Trash2,
  User,
  Clock,
  ChevronRight,
  AlertCircle,
  Tag,
  Filter,
  CheckSquare,
  Calendar,
  Palette,
  Check,
  RotateCcw,
  Sliders,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import CallModal from './CallModal';
import { logAuditActivity } from '../../lib/auditLogger';
import { getUnifiedHolidayNotices, deleteHolidayNotice } from '../../lib/festivalHolidays';

// Default Role Dot Indicator Configurations
export const DEFAULT_ROLE_DOTS = {
  admin: { color: '#ef4444', label: 'Administrator', roleName: 'Admin' }, // Red dot on upper of admin
  manager: { color: '#3b82f6', label: 'Practice Manager', roleName: 'Manager' }, // Blue dot upper on manager
  other: { color: '#10b981', label: 'Staff / Other', roleName: 'Team Member' }, // Option for other chat dot color to recognize easily
  associate: { color: '#8b5cf6', label: 'Associate / Trainee', roleName: 'Associate' },
  auditor: { color: '#f59e0b', label: 'Auditor / Specialist', roleName: 'Auditor' },
  client: { color: '#06b6d4', label: 'Client / Guest', roleName: 'Client' }
};

// Preset Color Swatches for Other Chat Dot Recognition
export const PRESET_OTHER_COLORS = [
  { id: 'emerald', name: 'Emerald Green (Default)', hex: '#10b981', desc: 'Fresh & distinct green' },
  { id: 'purple', name: 'Royal Purple', hex: '#8b5cf6', desc: 'Vibrant purple accent' },
  { id: 'amber', name: 'Warm Amber', hex: '#f59e0b', desc: 'Warm golden amber' },
  { id: 'orange', name: 'Vibrant Orange', hex: '#f97316', desc: 'Energetic coral orange' },
  { id: 'cyan', name: 'Cyan / Sky', hex: '#06b6d4', desc: 'Bright cyan blue' },
  { id: 'pink', name: 'Rose / Pink', hex: '#ec4899', desc: 'Modern rose pink' },
  { id: 'indigo', name: 'Deep Indigo', hex: '#6366f1', desc: 'Classic indigo tone' },
  { id: 'teal', name: 'Teal Green', hex: '#14b8a6', desc: 'Clean aquatic teal' },
  { id: 'slate', name: 'Slate Gray', hex: '#64748b', desc: 'Neutral slate gray' },
  { id: 'lime', name: 'Lime Glow', hex: '#84cc16', desc: 'High visibility lime' }
];

// Helper to determine sender role category from message metadata
export const resolveSenderRoleCategory = (m, currentUserEmail, currentUserRole) => {
  if (m.isMe) {
    const r = (currentUserRole || '').toLowerCase();
    const e = (currentUserEmail || '').toLowerCase();
    if (r.includes('admin') || r.includes('cfo') || r.includes('director') || r.includes('super') || e.includes('admin') || e.includes('cfo')) {
      return { category: 'admin', label: 'Admin', roleName: 'Admin' };
    }
    if (r.includes('manager') || r.includes('lead') || r.includes('partner') || r.includes('head')) {
      return { category: 'manager', label: 'Manager', roleName: 'Manager' };
    }
    return { category: 'other', label: 'Staff / Other', roleName: currentUserRole || 'Team Member' };
  }

  const roleStr = (m.senderRole || m.role || '').toLowerCase();
  const emailStr = (m.senderEmail || m.senderId || '').toLowerCase();
  const nameStr = (m.senderName || '').toLowerCase();

  // 1. Admin recognition (Red Dot)
  if (
    roleStr.includes('admin') || 
    roleStr.includes('super') || 
    roleStr.includes('cfo') || 
    roleStr.includes('director') || 
    emailStr.includes('admin') || 
    emailStr.includes('cfo') || 
    emailStr.includes('superadmin') ||
    nameStr.includes('admin') ||
    nameStr.includes('cfo')
  ) {
    return { category: 'admin', label: 'Admin', roleName: m.senderRole || 'Administrator' };
  }

  // 2. Manager recognition (Blue Dot)
  if (
    roleStr.includes('manager') || 
    roleStr.includes('lead') || 
    roleStr.includes('head') || 
    roleStr.includes('partner') || 
    roleStr.includes('architect') || 
    roleStr.includes('strategist') ||
    emailStr.includes('manager') ||
    nameStr.includes('manager')
  ) {
    return { category: 'manager', label: 'Manager', roleName: m.senderRole || 'Manager' };
  }

  // 3. Auditor recognition
  if (roleStr.includes('auditor') || roleStr.includes('audit')) {
    return { category: 'auditor', label: 'Auditor', roleName: m.senderRole || 'Auditor' };
  }

  // 4. Associate recognition
  if (roleStr.includes('associate') || roleStr.includes('trainee') || roleStr.includes('junior')) {
    return { category: 'associate', label: 'Associate', roleName: m.senderRole || 'Associate' };
  }

  // 5. Client recognition
  if (roleStr.includes('client') || roleStr.includes('guest') || emailStr.includes('client')) {
    return { category: 'client', label: 'Client', roleName: m.senderRole || 'Client' };
  }

  // 6. Default Other Team Member
  return { 
    category: 'other', 
    label: 'Staff / Other', 
    roleName: m.senderRole || (roleStr ? m.senderRole : 'Staff') 
  };
};

// Helper to get dot color from settings
export const getRoleDotColor = (category, settings) => {
  if (settings && settings[category] && settings[category].color) {
    return settings[category].color;
  }
  return DEFAULT_ROLE_DOTS[category]?.color || settings?.other?.color || '#10b981';
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

// Default Firm Notices Seed Data
const DEFAULT_NOTICES = [
  {
    id: 'NOTICE-1',
    title: 'Advance Tax Q2 Installment Filing Notice',
    message: 'All engagement partners & senior associates must finalize corporate advance tax estimates for FY 2026-27 by September 12. Kindly cross-verify AIS/TIS and Form 26AS data prior to generating client payment challans.',
    priority: 'Urgent',
    authorName: 'CA Admin',
    authorRole: 'Administrator',
    targetDept: 'Tax Compliance',
    date: '2026-08-23',
    isPinned: true,
    isHoliday: false,
    acknowledgedBy: ['admin@taxpro.com', 'krushil@taxpro.com']
  },
  {
    id: 'NOTICE-2',
    title: 'GSTR-2B Automated ITC Reconciliation Directives',
    message: 'Please ensure all purchases without matching invoices on the GST Portal are flagged with vendor codes. Unreconciled ITC entries older than 60 days must be escalated to the Audit manager immediately.',
    priority: 'Compliance Alert',
    authorName: 'Practice Lead',
    authorRole: 'Manager',
    targetDept: 'GST & Direct Tax',
    date: '2026-08-22',
    isPinned: true,
    isHoliday: false,
    acknowledgedBy: ['admin@taxpro.com']
  },
  {
    id: 'NOTICE-3',
    title: 'Office Working Hours & Upcoming Regional Holiday Notice',
    message: 'In observance of the upcoming state festive holiday, our physical and digital practice workstations will remain closed on Friday. Emergency client audit queries will be handled on standby via our portal support.',
    priority: 'Holiday / Practice Closed',
    authorName: 'HR & Practice Admin',
    authorRole: 'Administrator',
    targetDept: 'All Departments',
    date: '2026-08-28',
    isPinned: false,
    isHoliday: true,
    holidayDate: '2026-08-28',
    practiceStatus: 'Office Closed',
    acknowledgedBy: ['admin@taxpro.com']
  }
];

// Helper to format date: YYYY-MM-DD
const formatYMD = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
              <span>{callData.callType === 'video' ? 'Recorded Video Conference' : 'Recorded Voice Conference'}</span>
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
            download={callData.recordingName || 'conference_recording.webm'}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'
            }`}
            title="Download Conference Audio"
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
          <span>Conference voice call encrypted & audit logged in practice records.</span>
        </div>
      )}
    </div>
  );
}

export default function CommunicationView({ onShowToast }) {
  // Navigation: 'broadcast' (Chat & Calls) | 'notices' (Firm Notice Board)
  const [activeTab, setActiveTab] = useState('broadcast');

  // Broadcast Chat States
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [selectedAttachment, setSelectedAttachment] = useState(null); // { name, type, size, dataUrl }
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  // Call State
  const [callModalState, setCallModalState] = useState({ isOpen: false, callType: 'audio' });

  // Lightbox Image Preview Modal
  const [previewImage, setPreviewImage] = useState(null);

  // Notice Board States
  const [notices, setNotices] = useState(() => getUnifiedHolidayNotices());

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

  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [noticeModalTab, setNoticeModalTab] = useState('create'); // 'create' | 'manage'
  const [selectedNoticeForView, setSelectedNoticeForView] = useState(null);
  const [noticeFilter, setNoticeFilter] = useState('All');
  const [noticeSearch, setNoticeSearch] = useState('');
  const [noticeForm, setNoticeForm] = useState({
    title: '',
    message: '',
    priority: 'Urgent',
    targetDept: 'All Departments',
    date: formatYMD(new Date()),
    isPinned: false,
    isHoliday: false,
    holidayDate: formatYMD(new Date()),
    holidayEndDate: '',
    practiceStatus: 'Office Closed'
  });

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const currentUserEmail = (localStorage.getItem('taxpro_user_email') || 'admin@taxpro.com').toLowerCase().trim();
  const currentUserName = localStorage.getItem('taxpro_user_name') || localStorage.getItem('taxpro_user_fullname') || 'Administrator';
  const userRole = (localStorage.getItem('taxpro_user_role') || 'admin').toLowerCase();
  const isAdminFlag = localStorage.getItem('taxpro_is_admin') === 'true';
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

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

  // Permission: Admin & Manager can post/delete notices; Employees can view and acknowledge
  const canSendNotice = isAdminFlag || userRole === 'admin' || userRole === 'manager' || currentUserEmail.includes('admin');

  // Save Notices to localStorage
  const saveNotices = (newNotices) => {
    setNotices(newNotices);
    try {
      localStorage.setItem('taxpro_firm_notices', JSON.stringify(newNotices));
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('taxpro_notices_updated', { detail: newNotices }));
  };

  // Sync notices across tabs/windows
  useEffect(() => {
    const handleNoticesUpdate = (e) => {
      if (e.detail) setNotices(e.detail);
    };
    window.addEventListener('taxpro_notices_updated', handleNoticesUpdate);
    return () => window.removeEventListener('taxpro_notices_updated', handleNoticesUpdate);
  }, []);

  // 1. Fetch broadcast messages from PostgreSQL SQL
  const fetchBroadcast = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/chat/broadcast?channel=general-hq&currentUserEmail=${encodeURIComponent(currentUserEmail)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('[Communication] Broadcast fetch error:', err.message);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [baseUrl, currentUserEmail]);

  // Initial load
  useEffect(() => {
    fetchBroadcast();
  }, [fetchBroadcast]);

  // 2. Real-Time Multi-Device Poller (Every 2.5s)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchBroadcast(true);
    }, 2500);
    return () => clearInterval(interval);
  }, [fetchBroadcast]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'broadcast') {
      scrollToBottom();
    }
  }, [messages, selectedAttachment, activeTab]);

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

  // 3. Send Broadcast Message (Persists in PostgreSQL SQL)
  const handleSend = async (e) => {
    e?.preventDefault();
    const text = inputMsg.trim();
    if ((!text && !selectedAttachment) || isSending) return;

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

    const optimisticMsg = {
      id: `OPT-${Date.now()}`,
      text: payloadContent,
      senderId: currentUserName.substring(0, 2).toUpperCase(),
      senderEmail: currentUserEmail,
      senderName: currentUserName,
      channel: 'general-hq',
      isMe: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`${baseUrl}/api/chat/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: currentUserEmail,
          sender_name: currentUserName,
          sender_avatar: currentUserName.substring(0, 2).toUpperCase(),
          content: payloadContent,
          channel: 'general-hq'
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to post announcement.');
      }

      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data.message : m));
    } catch (err) {
      if (onShowToast) onShowToast(`Broadcast failure: ${err.message}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Handle Call Ended & Auto-Post Recorded Voice Call Log to Broadcast
  const handleCallEnded = async (callSummary) => {
    const callPayload = JSON.stringify({
      __taxproMsg: true,
      text: `📞 ${callSummary.callType === 'video' ? 'Recorded Video Conference' : 'Recorded Voice Conference'} (${callSummary.durationFormatted})`,
      callData: callSummary
    });

    const optimisticMsg = {
      id: `CALL-MSG-${Date.now()}`,
      text: callPayload,
      senderId: currentUserName.substring(0, 2).toUpperCase(),
      senderEmail: currentUserEmail,
      senderName: currentUserName,
      channel: 'general-hq',
      isMe: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMsg]);

    try {
      await fetch(`${baseUrl}/api/chat/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: currentUserEmail,
          sender_name: currentUserName,
          sender_avatar: currentUserName.substring(0, 2).toUpperCase(),
          content: callPayload,
          channel: 'general-hq'
        })
      });
    } catch (e) {
      console.warn('Broadcast call recording post error:', e);
    }
  };

  // Start Voice Group Call
  const handleStartGroupAudioCall = () => {
    setCallModalState({ isOpen: true, callType: 'audio' });
  };

  // Start Video Group Call
  const handleStartGroupVideoCall = () => {
    setCallModalState({ isOpen: true, callType: 'video' });
  };

  // Create Notice Handler (Admin and Manager)
  const handleCreateNotice = (e) => {
    e.preventDefault();
    if (!noticeForm.title.trim() || !noticeForm.message.trim()) return;

    const isHoliday = noticeForm.priority === 'Holiday / Practice Closed' || noticeForm.priority === 'Holiday / Event' || noticeForm.isHoliday;
    const newNotice = {
      id: `NOTICE-${Date.now()}`,
      title: noticeForm.title.trim(),
      message: noticeForm.message.trim(),
      priority: noticeForm.priority || 'General',
      targetDept: noticeForm.targetDept || 'All Departments',
      date: noticeForm.date || formatYMD(new Date()),
      isPinned: !!noticeForm.isPinned,
      isHoliday: !!isHoliday,
      holidayDate: noticeForm.holidayDate || noticeForm.date || formatYMD(new Date()),
      holidayEndDate: noticeForm.holidayEndDate || '',
      practiceStatus: noticeForm.practiceStatus || (isHoliday ? 'Office Closed' : ''),
      authorName: currentUserName,
      authorRole: canSendNotice ? 'Management' : 'Staff',
      acknowledgedBy: [currentUserEmail]
    };

    const updated = [newNotice, ...notices];
    saveNotices(updated);
    setIsNoticeModalOpen(false);
    setNoticeForm({
      title: '',
      message: '',
      priority: 'Urgent',
      targetDept: 'All Departments',
      date: formatYMD(new Date()),
      isPinned: false,
      isHoliday: false,
      holidayDate: formatYMD(new Date()),
      holidayEndDate: '',
      practiceStatus: 'Office Closed'
    });

    logAuditActivity('FIRM_NOTICE_POSTED', `Posted official notice: "${newNotice.title}" [${newNotice.priority}]`, 'Communication');
    if (onShowToast) {
      if (isHoliday) {
        onShowToast(`🏖️ Holiday Notice published! Automatically synced to Workforce Calendar for ${newNotice.holidayDate}.`, 'success');
      } else {
        onShowToast('✓ Official Notice published to all staff members!', 'success');
      }
    }
  };

  // Delete / Remove Notice Handler (Admin and Manager)
  const handleDeleteNotice = (id) => {
    const noticeToDelete = notices.find(n => n.id === id);
    const updated = deleteHolidayNotice(id);
    setNotices(updated);
    logAuditActivity('FIRM_NOTICE_DELETED', `Deleted notice: ${noticeToDelete?.title || id}`, 'Communication');
    if (onShowToast) {
      if (noticeToDelete?.isHoliday || noticeToDelete?.priority?.toLowerCase().includes('holiday')) {
        onShowToast('✓ Holiday notice removed. Workforce Calendar updated.', 'info');
      } else {
        onShowToast('✓ Notice removed successfully.', 'info');
      }
    }
  };

  // Toggle Acknowledge Receipt for Employees
  const handleToggleAcknowledge = (id) => {
    const updated = notices.map(n => {
      if (n.id === id) {
        const currentAck = n.acknowledgedBy || [];
        const isAck = currentAck.includes(currentUserEmail);
        const newAck = isAck
          ? currentAck.filter(e => e !== currentUserEmail)
          : [...currentAck, currentUserEmail];
        return { ...n, acknowledgedBy: newAck };
      }
      return n;
    });
    saveNotices(updated);
    if (onShowToast) onShowToast('✓ Notice receipt acknowledged!', 'success');
  };

  // Filtered Notices Memo
  const filteredNotices = useMemo(() => {
    return notices
      .filter(n => {
        if (noticeFilter !== 'All' && n.priority !== noticeFilter) return false;
        if (noticeSearch.trim()) {
          const q = noticeSearch.toLowerCase();
          const matchTitle = n.title?.toLowerCase().includes(q);
          const matchMsg = n.message?.toLowerCase().includes(q);
          const matchDept = n.targetDept?.toLowerCase().includes(q);
          const matchAuthor = n.authorName?.toLowerCase().includes(q);
          return matchTitle || matchMsg || matchDept || matchAuthor;
        }
        return true;
      })
      .sort((a, b) => {
        // Pinned notices first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.date || 0) - new Date(a.date || 0);
      });
  }, [notices, noticeFilter, noticeSearch]);

  const hasUnreadNotices = notices.some(n => !(n.acknowledgedBy || []).includes(currentUserEmail));
  const urgentCount = notices.filter(n => n.priority === 'Urgent' || n.priority === 'Compliance Alert').length;
  const acknowledgedCount = notices.filter(n => (n.acknowledgedBy || []).includes(currentUserEmail)).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f3f4f6] min-h-screen text-gray-800 flex flex-col relative">
      
      {/* Hidden File Input for Attachments */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
        className="hidden"
      />

      {/* CALL MODAL (AUDIO / VIDEO CONFERENCE WITH VOICE RECORDING) */}
      <CallModal
        isOpen={callModalState.isOpen}
        onClose={() => setCallModalState({ isOpen: false, callType: 'audio' })}
        callType={callModalState.callType}
        isGroup={true}
        channelName="# general-hq Firm Conference"
        groupMembers={['CA Admin', 'GST Specialist', 'Direct Tax Lead', 'Audit Associate']}
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

      {/* ==============================================================
          TOP HEADER & DUAL NAVIGATION SWITCHER
          ============================================================== */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        
        {/* Navigation Tabs */}
        <div className="bg-white p-1.5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-1.5">
          
          {/* TAB 1: TEAM BROADCAST */}
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`py-2 px-4 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'broadcast'
                ? 'bg-[#5b52e0] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Team Broadcast (#general-hq)</span>
          </button>

          {/* TAB 2: FIRM NOTICES */}
          <button
            onClick={() => setActiveTab('notices')}
            className={`py-2 px-4 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer relative ${
              activeTab === 'notices'
                ? 'bg-[#5b52e0] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Megaphone className="w-4 h-4 text-amber-500" />
            <span>Firm Notices & Circulars</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'notices' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
            }`}>
              {notices.length}
            </span>
            {hasUnreadNotices && (
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white absolute -top-1 -right-1 animate-pulse" />
            )}
          </button>
        </div>

        {/* Action Controls based on active tab */}
        {activeTab === 'broadcast' ? (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => fetchBroadcast()}
              title="Sync Latest Announcements"
              className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 hover:text-indigo-600 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:bg-gray-50 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
              Sync Now
            </button>
            <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 rounded-full border border-emerald-100">
              <Circle className="w-2 h-2 text-emerald-500 fill-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-700">Live Multi-Device Chat</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {canSendNotice ? (
              <button
                onClick={() => setIsNoticeModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Post Official Notice</span>
              </button>
            ) : (
              <span className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Staff Circulars Feed
              </span>
            )}
          </div>
        )}
      </div>

      {/* ==============================================================
          CONTENT AREA: TAB 1 (BROADCAST CHAT & CALLS)
          ============================================================== */}
      {activeTab === 'broadcast' && (
        <div className="flex-1 bg-white border border-gray-200 rounded-3xl shadow-xs overflow-hidden flex flex-col h-[72vh] animate-fadeIn">
          
          {/* Chat Header with Voice & Video Call Buttons & Role Dot Legend */}
          <div className="px-6 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center border border-indigo-200 shadow-2xs shrink-0">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-gray-900"># general-hq</h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-200">
                    Live Broadcast
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 font-semibold">Firm-wide team discussions, announcements, and recorded calls.</p>
              </div>
            </div>

            {/* Middle/Right: Role Dot Legend & Recognition Customizer */}
            <div className="flex items-center gap-2 flex-wrap">
              
              {/* Active Dot Indicators Quick Legend */}
              <div className="flex items-center gap-2 bg-white/90 border border-gray-200 rounded-xl px-3 py-1.5 text-xs shadow-2xs">
                <span className="text-[11px] font-bold text-gray-500 hidden md:inline">Dot Indicators:</span>
                
                {/* Admin Dot (Red) */}
                <div className="flex items-center gap-1.5" title="Admin Chat Dot: Red (Upper)">
                  <span 
                    className="w-2.5 h-2.5 rounded-full shadow-2xs ring-1 ring-white" 
                    style={{ backgroundColor: dotSettings.admin?.color || '#ef4444' }} 
                  />
                  <span className="text-[11px] font-bold text-gray-700">Admin</span>
                </div>

                <span className="text-gray-300">•</span>

                {/* Manager Dot (Blue) */}
                <div className="flex items-center gap-1.5" title="Manager Chat Dot: Blue (Upper)">
                  <span 
                    className="w-2.5 h-2.5 rounded-full shadow-2xs ring-1 ring-white" 
                    style={{ backgroundColor: dotSettings.manager?.color || '#3b82f6' }} 
                  />
                  <span className="text-[11px] font-bold text-gray-700">Manager</span>
                </div>

                <span className="text-gray-300">•</span>

                {/* Other Chat Dot (Customizable) */}
                <div className="flex items-center gap-1.5" title="Other Chat Dot (Customizable Color)">
                  <span 
                    className="w-2.5 h-2.5 rounded-full shadow-2xs ring-1 ring-white" 
                    style={{ backgroundColor: dotSettings.other?.color || '#10b981' }} 
                  />
                  <span className="text-[11px] font-bold text-gray-700">Other Chat</span>
                </div>

                {/* Dot Color Customizer Option Button */}
                <button
                  type="button"
                  onClick={() => {
                    setTempDotSettings({ ...dotSettings });
                    setIsDotSettingsModalOpen(true);
                  }}
                  className="ml-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[10px] flex items-center gap-1 transition-all cursor-pointer border border-indigo-200 active:scale-95"
                  title="Customize dot colors to recognize other chat easily"
                >
                  <Palette className="w-3 h-3 text-indigo-600" />
                  <span>Dot Color Options</span>
                </button>
              </div>

              {/* Calling Action Buttons (Voice & Video Call with Audio Recording) */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleStartGroupAudioCall}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-[#5b52e0] border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                  title="Start Voice Conference (Auto-Recorded)"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Voice Call</span>
                </button>

                <button
                  onClick={handleStartGroupVideoCall}
                  className="px-3 py-1.5 bg-[#5b52e0] hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
                  title="Start Video Conference (Auto-Recorded)"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Video Call</span>
                </button>
              </div>

            </div>
          </div>

          {/* Messages Feed Area - Our Chat is on Our Side (Right), Other Chat is on Opposite Side (Left) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50/30 scrollbar-thin">
            {isLoading && messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-gray-400 gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Loading announcements...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
                  <MessageSquare className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-sm font-bold text-gray-700">No broadcast messages yet</h3>
                <p className="text-xs max-w-xs mt-1">Start the conversation by posting an announcement below or initiating a recorded conference call.</p>
              </div>
            ) : (
              messages.map((m) => {
                const { text, attachment, callData } = parseMessagePayload(m.text || m.content);
                const roleInfo = resolveSenderRoleCategory(m, currentUserEmail, userRole);
                const dotColor = getRoleDotColor(roleInfo.category, dotSettings);

                return (
                  <div 
                    key={m.id} 
                    className={`w-full flex transition-all ${m.isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-3 max-w-[88%] sm:max-w-xl ${m.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      
                      {/* Avatar with Upper Role Dot (Red on upper of Admin, Blue on upper of Manager, Custom on other) */}
                      <div className="relative shrink-0 self-start mt-0.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-2xs ${
                          m.isMe ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {m.senderAvatar || m.senderId || (m.senderName ? m.senderName.substring(0, 2).toUpperCase() : 'TP')}
                        </div>
                        
                        {/* Upper Dot Indicator */}
                        <span
                          className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm flex items-center justify-center cursor-help transition-transform hover:scale-125 z-10"
                          style={{ backgroundColor: dotColor }}
                          title={`${roleInfo.label} (${roleInfo.roleName})`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-pulse" />
                        </span>
                      </div>

                      {/* Message Content & Header */}
                      <div className={`flex flex-col min-w-0 ${m.isMe ? 'items-end' : 'items-start'}`}>
                        
                        {/* Header Row: Upper Dot + Sender Name + Role Badge + Email */}
                        <div className={`flex items-center gap-1.5 mb-1 px-1 flex-wrap ${m.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          <span 
                            className="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-2xs shrink-0" 
                            style={{ backgroundColor: dotColor }}
                            title={`Role Dot: ${roleInfo.label}`}
                          />
                          <span className="text-[11px] font-bold text-gray-800">
                            {m.isMe ? `${m.senderName || 'You'} (You)` : (m.senderName || 'Team Member')}
                          </span>
                          <span
                            className="px-1.5 py-0.2 rounded-md text-[9px] font-extrabold uppercase tracking-wide border shadow-2xs"
                            style={{
                              backgroundColor: `${dotColor}18`,
                              borderColor: `${dotColor}40`,
                              color: dotColor
                            }}
                          >
                            {roleInfo.roleName}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">{m.senderEmail || ''}</span>
                        </div>

                        {/* Speech Bubble - Our Chat in Indigo/Brand on Right Side, Other Chat in White on Left Side */}
                        <div className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm font-medium shadow-xs ${
                          m.isMe 
                            ? 'bg-[#5b52e0] text-white rounded-tr-xs text-left' 
                            : 'bg-white text-gray-800 border border-gray-100 rounded-tl-xs text-left'
                        }`}>
                          
                          {/* 1. RECORDED CONFERENCE CALL CARD & AUDIO PLAYER */}
                          {callData && (
                            <div className="mb-2">
                              <InMessageAudioPlayer callData={callData} isMe={m.isMe} />
                            </div>
                          )}

                          {/* 2. ATTACHMENT CARD */}
                          {attachment && (
                            <div className="mb-2">
                              {attachment.type?.startsWith('image/') ? (
                                <div className="relative group rounded-xl overflow-hidden border border-black/10">
                                  <img
                                    src={attachment.dataUrl}
                                    alt={attachment.name}
                                    className="max-h-60 w-full object-cover cursor-pointer transition-transform hover:scale-102"
                                    onClick={() => setPreviewImage(attachment)}
                                  />
                                  <div className="p-2 bg-black/40 backdrop-blur-xs flex items-center justify-between text-white text-[11px] absolute bottom-0 inset-x-0">
                                    <span className="truncate font-semibold max-w-[180px]">{attachment.name}</span>
                                    <button
                                      onClick={() => setPreviewImage(attachment)}
                                      className="p-1 rounded hover:bg-white/20 text-white cursor-pointer"
                                      title="View Fullscreen"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className={`p-3 rounded-xl flex items-center gap-3 border ${
                                  m.isMe ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                                }`}>
                                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                    m.isMe ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600'
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
                                      m.isMe ? 'hover:bg-white/20 text-white' : 'hover:bg-indigo-50 text-indigo-600'
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
                        </div>
                        <span className="text-[9px] font-semibold text-gray-400 mt-1 mx-1.5">{m.time}</span>
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
                    {selectedAttachment.size} • Ready to broadcast
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

          {/* Input Footer Area */}
          <div className="p-4 bg-white border-t border-gray-100">
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
                  placeholder="Post an announcement or notice to the team..."
                  value={inputMsg}
                  onChange={e => setInputMsg(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-xs sm:text-sm px-5 py-2.5 rounded-full outline-none focus:border-indigo-500 focus:bg-white transition-all pr-10 text-gray-800 font-medium"
                />
              </div>

              <button 
                type="submit" 
                disabled={(!inputMsg.trim() && !selectedAttachment) || isSending}
                className={`p-3 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer ${
                  (inputMsg.trim() || selectedAttachment) && !isSending ? 'bg-[#5b52e0] text-white hover:scale-105' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send className={`w-4 h-4 ${inputMsg.trim() ? 'ml-0.5' : ''}`} />
              </button>
            </form>
          </div>

        </div>
      )}

      {/* ==============================================================
          CONTENT AREA: TAB 2 (OFFICIAL FIRM NOTICES & CIRCULARS)
          ============================================================== */}
      {activeTab === 'notices' && (
        <div className="flex flex-col gap-6 animate-fadeIn">
          
          {/* 3 Metric Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Card 1: Total Notices */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Firm Notices</span>
                <h3 className="text-2xl font-black font-outfit text-gray-900 mt-1">{notices.length}</h3>
                <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">Official Directives</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Megaphone className="w-6 h-6" />
              </div>
            </div>

            {/* Card 2: Urgent & Compliance */}
            <div className="bg-white border border-rose-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Urgent & Alerts</span>
                <h3 className="text-2xl font-black font-outfit text-rose-900 mt-1">{urgentCount}</h3>
                <p className="text-[11px] text-rose-500 font-semibold mt-0.5">High-priority action required</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>

            {/* Card 3: Acknowledged Count */}
            <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Your Acknowledged</span>
                <h3 className="text-2xl font-black font-outfit text-emerald-900 mt-1">{acknowledgedCount} / {notices.length}</h3>
                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Confirmed read status</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCheck className="w-6 h-6" />
              </div>
            </div>

          </div>

          {/* Notice Board Main Container */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs flex flex-col gap-5">
            
            {/* Search & Category Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-100 pb-5">
              
              {/* Search Bar */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search notices by keyword, title, dept..."
                  value={noticeSearch}
                  onChange={(e) => setNoticeSearch(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 outline-none focus:bg-white focus:border-indigo-500 transition-all font-medium"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none text-xs">
                {['All', 'Urgent', 'Compliance Alert', 'General', 'Holiday / Event'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setNoticeFilter(tab)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                      noticeFilter === tab 
                        ? 'bg-[#5b52e0] text-white shadow-xs' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab === 'Urgent' && '🚨 '}
                    {tab === 'Compliance Alert' && '⚖️ '}
                    {tab === 'General' && '📢 '}
                    {tab === 'Holiday / Event' && '🏖️ '}
                    {tab}
                  </button>
                ))}
              </div>

            </div>

            {/* Notices Feed Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredNotices.length === 0 ? (
                <div className="col-span-full text-center py-16 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-gray-700">No firm notices found</h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    {canSendNotice 
                      ? 'Click "+ Post Official Notice" at the top right to broadcast a management circular.' 
                      : 'No notices currently match your search criteria.'}
                  </p>
                </div>
              ) : (
                filteredNotices.map((n) => {
                  const isAcknowledged = (n.acknowledgedBy || []).includes(currentUserEmail);
                  const isUrgent = n.priority === 'Urgent';
                  const isCompliance = n.priority === 'Compliance Alert';
                  const isHoliday = n.priority === 'Holiday / Event';

                  return (
                    <div
                      key={n.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between relative ${
                        n.isPinned
                          ? 'bg-amber-50/40 border-amber-200 shadow-2xs hover:shadow-md'
                          : isUrgent 
                            ? 'bg-rose-50/30 border-rose-200 hover:shadow-md'
                            : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md'
                      }`}
                    >
                      {/* Top Row Badges & Actions */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isUrgent 
                                ? 'bg-rose-100 text-rose-800' 
                                : isCompliance
                                  ? 'bg-amber-100 text-amber-800'
                                  : isHoliday
                                    ? 'bg-teal-100 text-teal-800'
                                    : 'bg-indigo-100 text-indigo-800'
                            }`}>
                              {n.priority}
                            </span>

                            {n.isPinned && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black flex items-center gap-1">
                                <Pin className="w-2.5 h-2.5" /> Pinned
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-gray-400">
                            <span className="text-[10px] font-mono">{n.date}</span>
                            {canSendNotice && (
                              <button
                                onClick={() => handleDeleteNotice(n.id)}
                                className="p-1 rounded hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete Notice"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Title */}
                        <h3 
                          onClick={() => setSelectedNoticeForView(n)}
                          className="text-sm font-extrabold text-gray-900 font-outfit mb-2 hover:text-[#5b52e0] transition-colors cursor-pointer leading-snug"
                        >
                          {n.title}
                        </h3>

                        {/* Message Body */}
                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-4 mb-4">
                          {n.message}
                        </p>
                      </div>

                      {/* Footer: Author & Employee Acknowledge Button */}
                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                          <User className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="font-semibold">{n.authorName}</span>
                          <span className="text-gray-400">• {n.targetDept}</span>
                        </div>

                        {/* 1-Click Acknowledge Button */}
                        <button
                          onClick={() => handleToggleAcknowledge(n.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isAcknowledged
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs'
                              : 'bg-gray-100 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 border border-gray-200'
                          }`}
                        >
                          <CheckCheck className={`w-3.5 h-3.5 ${isAcknowledged ? 'text-emerald-600' : 'text-gray-400'}`} />
                          <span>{isAcknowledged ? 'Acknowledged' : 'Mark as Read'}</span>
                        </button>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

          </div>

        </div>
      )}

      {/* ==============================================================
          PUBLISH / MANAGE & REMOVE FIRM NOTICE MODAL (Admin & Manager)
          ============================================================== */}
      {isNoticeModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsNoticeModalOpen(false); }}
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col animate-scale-up max-h-[92vh]">
            
            {/* Header with 2 Tabs: Create vs Remove / Manage */}
            <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white p-5 sm:p-6 pb-0 flex flex-col justify-between border-b border-amber-800">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-xs">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black font-outfit text-white tracking-tight">
                      Firm Notice & Holiday Dispatcher
                    </h3>
                    <p className="text-xs text-amber-100 mt-0.5">
                      Publish compliance circulars, practice holidays, or remove notices
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setIsNoticeModalOpen(false)} 
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer shadow-xs"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Tabs inside the Modal */}
              <div className="flex items-center gap-2 border-b border-amber-500/40">
                <button
                  type="button"
                  onClick={() => setNoticeModalTab('create')}
                  className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    noticeModalTab === 'create'
                      ? 'border-white text-white font-extrabold'
                      : 'border-transparent text-amber-200 hover:text-white'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Publish New Notice</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNoticeModalTab('manage')}
                  className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    noticeModalTab === 'manage'
                      ? 'border-white text-white font-extrabold'
                      : 'border-transparent text-amber-200 hover:text-white'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Remove / Delete Notices ({notices.length})</span>
                </button>
              </div>
            </div>
            
            {noticeModalTab === 'create' ? (
              <form onSubmit={handleCreateNotice} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold scrollbar-thin">
                
                {/* Notice Title */}
                <div>
                  <label className="text-gray-700 block mb-1">Notice Title / Subject <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Advance Tax Q2 Filing Protocol or Diwali Festival Holiday"
                    value={noticeForm.title}
                    onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                    className="w-full bg-gray-50 rounded-xl px-3.5 py-2.5 border border-gray-300 outline-none focus:bg-white focus:border-amber-500 text-xs font-bold text-gray-900"
                  />
                </div>

                {/* Notice Message */}
                <div>
                  <label className="text-gray-700 block mb-1">Message Content / Circular Body <span className="text-red-500">*</span></label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Type full notice circular, guidelines, office closure details, or compliance instructions for staff..."
                    value={noticeForm.message}
                    onChange={(e) => setNoticeForm({ ...noticeForm, message: e.target.value })}
                    className="w-full bg-gray-50 rounded-xl p-3 border border-gray-300 outline-none focus:bg-white focus:border-amber-500 text-xs text-gray-800 leading-relaxed resize-none"
                  />
                </div>

                {/* Priority & Target Department */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-700 block mb-1">Notice Classification / Category</label>
                    <select
                      value={noticeForm.priority}
                      onChange={(e) => {
                        const val = e.target.value;
                        const isHol = val.includes('Holiday');
                        setNoticeForm({ 
                          ...noticeForm, 
                          priority: val, 
                          isHoliday: isHol,
                          practiceStatus: isHol ? 'Office Closed' : noticeForm.practiceStatus 
                        });
                      }}
                      className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-300 outline-none focus:bg-white focus:border-amber-500 text-xs cursor-pointer font-bold"
                    >
                      <option value="Urgent">🚨 Urgent (Action Required)</option>
                      <option value="Compliance Alert">⚖️ Compliance Alert</option>
                      <option value="General">📢 General Announcement</option>
                      <option value="Holiday / Practice Closed">🏖️ Holiday / Practice Closed (Auto Syncs to Calendar)</option>
                      <option value="Firm Event">🎉 Firm Event / Celebration</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-700 block mb-1">Target Audience / Department</label>
                    <select
                      value={noticeForm.targetDept}
                      onChange={(e) => setNoticeForm({ ...noticeForm, targetDept: e.target.value })}
                      className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-300 outline-none focus:bg-white focus:border-amber-500 text-xs cursor-pointer"
                    >
                      <option value="All Departments">All Staff & Offices (All Departments)</option>
                      <option value="Audit & Assurance">Audit & Assurance</option>
                      <option value="Tax Compliance">Tax Compliance</option>
                      <option value="GST & Direct Tax">GST & Direct Tax</option>
                      <option value="Accounting & Payroll">Accounting & Payroll</option>
                      <option value="Corporate Law & Advisory">Corporate Law & Advisory</option>
                    </select>
                  </div>
                </div>

                {/* DEDICATED HOLIDAY AUTO-SYNC TO CALENDAR SETTINGS */}
                {(noticeForm.priority.includes('Holiday') || noticeForm.isHoliday) && (
                  <div className="p-4 rounded-2xl bg-amber-50/80 border-2 border-amber-300/80 flex flex-col gap-3 animate-fade-in shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                        <span className="text-base">🏖️</span>
                        <span>Practice Holiday & Calendar Integration</span>
                      </div>
                      <span className="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Auto Calendar Sync Active
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-gray-700 block mb-1">Holiday Effective Date</label>
                        <input
                          type="date"
                          value={noticeForm.holidayDate || noticeForm.date || formatYMD(new Date())}
                          onChange={(e) => setNoticeForm({ ...noticeForm, holidayDate: e.target.value, date: e.target.value })}
                          className="w-full bg-white rounded-xl px-3 py-2 border border-amber-300 outline-none focus:border-amber-600 text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-700 block mb-1">Practice Operation Status</label>
                        <select
                          value={noticeForm.practiceStatus}
                          onChange={(e) => setNoticeForm({ ...noticeForm, practiceStatus: e.target.value })}
                          className="w-full bg-white rounded-xl px-3 py-2 border border-amber-300 outline-none focus:border-amber-600 text-xs cursor-pointer font-semibold"
                        >
                          <option value="Office Closed">🔴 Complete Office & Practice Closure</option>
                          <option value="Partial Day / Half Day">🟡 Partial / Half-Day Operations</option>
                          <option value="Optional Holiday">🟢 Optional / Restricted Holiday</option>
                        </select>
                      </div>
                    </div>

                    <p className="text-[11px] text-amber-800 font-medium flex items-center gap-1.5">
                      <span>✨</span>
                      <span>This date will automatically be marked as a firm holiday on the <strong>Workforce Calendar</strong> for all staff members.</span>
                    </p>
                  </div>
                )}

                {/* Date & Pin to Top */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="text-gray-700 block mb-1">Circular Date</label>
                    <input
                      type="date"
                      value={noticeForm.date || formatYMD(new Date())}
                      onChange={(e) => setNoticeForm({ ...noticeForm, date: e.target.value, holidayDate: noticeForm.isHoliday ? e.target.value : noticeForm.holidayDate })}
                      className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-300 outline-none focus:bg-white focus:border-amber-500 text-xs"
                    />
                  </div>

                  <div className="pt-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={noticeForm.isPinned}
                        onChange={(e) => setNoticeForm({ ...noticeForm, isPinned: e.target.checked })}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-gray-300 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                        <Pin className="w-3.5 h-3.5 text-amber-600" /> Pin Notice to Top of Board
                      </span>
                    </label>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3 mt-3 -mx-6 -mb-6">
                  <button
                    type="button"
                    onClick={() => setNoticeModalTab('manage')}
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1.5 cursor-pointer underline"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Manage / Remove Published Notices</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsNoticeModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Publish Notice</span>
                    </button>
                  </div>
                </div>

              </form>
            ) : (
              /* TAB 2: MANAGE & REMOVE ACTIVE NOTICES */
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs scrollbar-thin">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900 font-outfit">
                      Active Published Notices ({notices.length})
                    </h4>
                    <p className="text-xs text-gray-500 font-medium">
                      One-click remove or delete any circular or practice holiday
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setNoticeModalTab('create')}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Post New Notice</span>
                  </button>
                </div>

                {notices.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <Megaphone className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-bold">No active notices published yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {notices.map((n) => {
                      const isHoliday = n.isHoliday || (n.priority || '').toLowerCase().includes('holiday');
                      return (
                        <div 
                          key={n.id} 
                          className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                            isHoliday ? 'bg-amber-50/60 border-amber-300/80' : 'bg-gray-50/80 border-gray-200'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                isHoliday 
                                  ? 'bg-amber-200 text-amber-900' 
                                  : n.priority === 'Urgent' 
                                    ? 'bg-rose-100 text-rose-800' 
                                    : 'bg-indigo-100 text-indigo-800'
                              }`}>
                                {isHoliday ? '🏖️ ' + n.priority : n.priority}
                              </span>
                              <span className="text-[10px] font-mono text-gray-500 font-semibold">{n.date || n.holidayDate}</span>
                              {n.isPinned && (
                                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">Pinned</span>
                              )}
                              <span className="text-[10px] text-gray-400">• {n.targetDept}</span>
                            </div>
                            <h5 className="font-extrabold text-gray-900 text-xs truncate font-outfit">{n.title}</h5>
                            <p className="text-[11px] text-gray-600 line-clamp-1 mt-0.5">{n.message}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteNotice(n.id)}
                            className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 font-bold text-xs border border-red-200 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
                            title="Remove this notice"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            <span>Remove Notice</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 mt-3 -mx-6 -mb-6">
                  <button
                    type="button"
                    onClick={() => setIsNoticeModalOpen(false)}
                    className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==============================================================
          NOTICE FULL READER & ACKNOWLEDGMENT MODAL
          ============================================================== */}
      {selectedNoticeForView && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedNoticeForView(null); }}
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col animate-scale-up max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-xs">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white">
                      {selectedNoticeForView.priority}
                    </span>
                    {selectedNoticeForView.isPinned && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                        <Pin className="w-2.5 h-2.5" /> Pinned
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-white tracking-tight mt-1">
                    {selectedNoticeForView.title}
                  </h3>
                </div>
              </div>

              <button 
                onClick={() => setSelectedNoticeForView(null)} 
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer shadow-xs"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-4 text-xs">
              
              {/* Meta details bar */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between flex-wrap gap-2 text-[11px]">
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="font-bold">{selectedNoticeForView.authorName}</span>
                  <span className="text-gray-400">({selectedNoticeForView.authorRole})</span>
                </div>
                <div className="flex items-center gap-3 text-gray-500 font-mono">
                  <span>Audience: <b>{selectedNoticeForView.targetDept}</b></span>
                  <span>• {selectedNoticeForView.date}</span>
                </div>
              </div>

              {/* Message Body */}
              <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs leading-relaxed text-sm text-gray-800 whitespace-pre-wrap">
                {selectedNoticeForView.message}
              </div>

              {/* Acknowledgment Stats */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                  <CheckCheck className="w-4 h-4 text-emerald-600" />
                  <span>{(selectedNoticeForView.acknowledgedBy || []).length} team member(s) acknowledged receipt</span>
                </div>

                <button
                  onClick={() => {
                    handleToggleAcknowledge(selectedNoticeForView.id);
                    setSelectedNoticeForView(prev => {
                      if (!prev) return null;
                      const isAck = (prev.acknowledgedBy || []).includes(currentUserEmail);
                      const newAck = isAck 
                        ? (prev.acknowledgedBy || []).filter(e => e !== currentUserEmail)
                        : [...(prev.acknowledgedBy || []), currentUserEmail];
                      return { ...prev, acknowledgedBy: newAck };
                    });
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    (selectedNoticeForView.acknowledgedBy || []).includes(currentUserEmail)
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  {(selectedNoticeForView.acknowledgedBy || []).includes(currentUserEmail)
                    ? '✓ You Acknowledged'
                    : 'Mark as Read / Acknowledge'}
                </button>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                {canSendNotice ? (
                  <button
                    onClick={() => {
                      handleDeleteNotice(selectedNoticeForView.id);
                      setSelectedNoticeForView(null);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Notice
                  </button>
                ) : <div />}

                <button
                  onClick={() => setSelectedNoticeForView(null)}
                  className="px-5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Done
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ==============================================================
          CHAT ROLE DOT COLOR RECOGNITION & CUSTOMIZER MODAL
          ============================================================== */}
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
              
              {/* Section 1: Standard Roles Overview */}
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

              {/* Section 2: Option to Choose Other Chat Dot Color */}
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

                {/* Quick Swatch Grid */}
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

              {/* Section 3: Live Interactive Simulated Chat Preview */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Live Chat Layout & Role Recognition Preview
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">Opposite Side (Left) vs Our Side (Right)</span>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-gray-200 shadow-inner flex flex-col gap-2.5">
                  {/* Admin Message (Opposite side - Left, Red Dot) */}
                  <div className="w-full flex justify-start">
                    <div className="flex items-start gap-2 max-w-[85%]">
                      <div className="relative shrink-0 mt-0.5">
                        <div className="w-6 h-6 rounded-lg bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-[10px]">
                          AD
                        </div>
                        <span 
                          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white shadow-xs" 
                          style={{ backgroundColor: tempDotSettings.admin?.color || '#ef4444' }} 
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-0.5 text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tempDotSettings.admin?.color || '#ef4444' }} />
                          <span className="font-bold text-gray-800">CA Admin</span>
                          <span className="px-1 py-0.1 rounded text-[8px] font-extrabold uppercase bg-red-50 text-red-700 border border-red-200">Admin</span>
                        </div>
                        <div className="p-2 rounded-xl rounded-tl-xs bg-gray-100 text-gray-800 text-[11px] font-medium">
                          Corporate Advance Tax estimates verified and finalized.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Manager Message (Opposite side - Left, Blue Dot) */}
                  <div className="w-full flex justify-start">
                    <div className="flex items-start gap-2 max-w-[85%]">
                      <div className="relative shrink-0 mt-0.5">
                        <div className="w-6 h-6 rounded-lg bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-[10px]">
                          MG
                        </div>
                        <span 
                          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white shadow-xs" 
                          style={{ backgroundColor: tempDotSettings.manager?.color || '#3b82f6' }} 
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-0.5 text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tempDotSettings.manager?.color || '#3b82f6' }} />
                          <span className="font-bold text-gray-800">Practice Lead</span>
                          <span className="px-1 py-0.1 rounded text-[8px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200">Manager</span>
                        </div>
                        <div className="p-2 rounded-xl rounded-tl-xs bg-gray-100 text-gray-800 text-[11px] font-medium">
                          GSTR-2B ITC reconciliation circular dispatched.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Other Member Message (Opposite side - Left, User-Selected Dot Color) */}
                  <div className="w-full flex justify-start">
                    <div className="flex items-start gap-2 max-w-[85%]">
                      <div className="relative shrink-0 mt-0.5">
                        <div className="w-6 h-6 rounded-lg bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-[10px]">
                          ST
                        </div>
                        <span 
                          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white shadow-xs" 
                          style={{ backgroundColor: tempDotSettings.other?.color || '#10b981' }} 
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-0.5 text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tempDotSettings.other?.color || '#10b981' }} />
                          <span className="font-bold text-gray-800">Audit Associate</span>
                          <span 
                            className="px-1 py-0.1 rounded text-[8px] font-extrabold uppercase border"
                            style={{
                              backgroundColor: `${tempDotSettings.other?.color || '#10b981'}15`,
                              borderColor: `${tempDotSettings.other?.color || '#10b981'}40`,
                              color: tempDotSettings.other?.color || '#10b981'
                            }}
                          >
                            Staff
                          </span>
                        </div>
                        <div className="p-2 rounded-xl rounded-tl-xs bg-gray-100 text-gray-800 text-[11px] font-medium">
                          Vouchers verified and cross-checked with 26AS.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Our Message (Our Side - Right, with our role dot) */}
                  <div className="w-full flex justify-end">
                    <div className="flex flex-row-reverse items-start gap-2 max-w-[85%]">
                      <div className="relative shrink-0 mt-0.5">
                        <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                          YOU
                        </div>
                        <span 
                          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white shadow-xs" 
                          style={{ backgroundColor: getRoleDotColor(userRole.includes('admin') ? 'admin' : userRole.includes('manager') ? 'manager' : 'other', tempDotSettings) }} 
                        />
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 mb-0.5 text-[10px]">
                          <span className="font-bold text-gray-800">You (Our Side)</span>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getRoleDotColor(userRole.includes('admin') ? 'admin' : userRole.includes('manager') ? 'manager' : 'other', tempDotSettings) }} />
                        </div>
                        <div className="p-2 rounded-xl rounded-tr-xs bg-[#5b52e0] text-white text-[11px] font-medium text-left">
                          Acknowledged! Proceeding with final filings.
                        </div>
                      </div>
                    </div>
                  </div>

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
