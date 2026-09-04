import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Mic, 
  MicOff, 
  Bot, 
  User, 
  Paperclip, 
  UploadCloud, 
  CheckCircle2, 
  Volume2, 
  VolumeX, 
  Database, 
  Activity, 
  Zap, 
  Sliders, 
  Maximize2, 
  Minimize2, 
  ArrowRight,
  TrendingUp,
  FolderKanban,
  Building2,
  Users2,
  FileText,
  AlertTriangle,
  FileSpreadsheet,
  Calendar,
  Layers,
  Copy,
  Download,
  Check,
  Image as ImageIcon,
  ExternalLink,
  Globe,
  Search,
  ShieldCheck,
  ArrowDown
} from 'lucide-react';
import soundFX from '../lib/audioFX';
import VoiceVisualizerCanvas from './VoiceVisualizerCanvas';
import { analyzeFinancialDocument } from '../lib/docIntelligence';
import WindowsVoiceEngine from '../lib/windowsVoiceEngine';
import AutonomousVoiceAgent from '../lib/autonomousVoiceAgent';

export default function AIAssistant({ 
  isOpen, 
  onClose, 
  onShowToast, 
  onLogout,
  screenContext = {} 
}) {
  // Voice & Interaction States: 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING'
  const [aiState, setAiState] = useState('IDLE');
  const [inputMsg, setInputMsg] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceSoundEnabled, setVoiceSoundEnabled] = useState(true);
  const [speechRate, setSpeechRate] = useState(1.05);
  const [isCompact, setIsCompact] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [audioStream, setAudioStream] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [speechLang, setSpeechLang] = useState('en-IN');
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Sensitive Confirmation State
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [activeScreen, setActiveScreen] = useState(() => {
    return localStorage.getItem('taxpro_active_nav') || 'Dashboard';
  });

  useEffect(() => {
    const handleScreenChange = (e) => {
      if (e.detail) setActiveScreen(e.detail);
    };
    window.addEventListener('taxpro_screen_changed', handleScreenChange);
    return () => window.removeEventListener('taxpro_screen_changed', handleScreenChange);
  }, []);

  const engineRef = useRef(null);
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

  const [messages, setMessages] = useState([
    {
      id: 'boot',
      sender: 'ai',
      text: '❖ **TaxPro Autonomous Voice AI Online**\n\nI am your financial and tax copilot, connected directly to your firm database. Speak naturally or say *"Hey TaxPro"* to issue commands, query financials, or ask for your daily briefing.',
      time: 'Ready',
      cardType: null
    }
  ]);

  // Window Dragging
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  const handlePointerDown = (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y
    };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition({
      x: dragRef.current.initialX + dx,
      y: dragRef.current.initialY + dy
    });
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    try { e.target.releasePointerCapture(e.pointerId); } catch (err) {}
  };

  const scrollToBottom = (behavior = 'smooth') => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
  };

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const scrolledUp = scrollHeight - scrollTop - clientHeight > 80;
    setIsUserScrolledUp(scrolledUp);
  };

  useEffect(() => {
    if (!isUserScrolledUp) {
      scrollToBottom('smooth');
    }
  }, [messages, interimTranscript, aiState, isUserScrolledUp]);

  // Check Web Speech API Support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSpeechSupported(Boolean(SpeechRecognition));

    return () => {
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Text-To-Speech with Barge-In / Interruptibility
  const speakText = useCallback((text) => {
    if (!voiceSoundEnabled || !window.speechSynthesis) {
      setAiState('IDLE');
      return;
    }

    window.speechSynthesis.cancel(); // Interrupt any prior speech
    const cleanText = text
      .replace(/[*_#`❖🤖]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    if (!cleanText) {
      setAiState('IDLE');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    
    // Choose natural clear voice
    const preferredVoice = voices.find(v => 
      v.name.includes('Natural') || 
      v.name.includes('Google UK English Female') || 
      v.name.includes('Samantha') || 
      v.name.includes('Zira') || 
      v.name.includes('Victoria')
    ) || voices[0];

    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = speechRate;
    utterance.pitch = 1.04;

    utterance.onstart = () => setAiState('SPEAKING');
    utterance.onend = () => {
      setAiState(shouldListenRef.current ? 'LISTENING' : 'IDLE');
    };
    utterance.onerror = () => {
      setAiState(shouldListenRef.current ? 'LISTENING' : 'IDLE');
    };

    window.speechSynthesis.speak(utterance);
  }, [voiceSoundEnabled, speechRate]);

  // Interrupt AI Speech when user starts speaking or clicks (Barge-In)
  const interruptSpeech = () => {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  };

  // Process User Command via Secure Backend AI Router
  const processCommand = async (rawText) => {
    const text = (rawText || inputMsg).trim();
    if (!text) return;

    interruptSpeech();
    setInterimTranscript('');
    setInputMsg('');
    setAiState('THINKING');

    // Append User Message
    const userMsgId = 'msg-' + Date.now();
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    // =========================================================================
    // INSTANT CLIENT-SIDE AUTONOMOUS VOICE ACTIONS (Clicking & Form Typing)
    // =========================================================================
    const lower = text.toLowerCase().trim();

    // 1. Voice Clicking ("click Save Client", "click Download CSV", "click on Tasks", etc.)
    if (
      lower.startsWith('click ') || 
      lower.startsWith('press ') || 
      lower.startsWith('tap ') || 
      lower.startsWith('select ') || 
      lower.startsWith('hit ') ||
      lower.includes('click on ') ||
      lower.includes('click button ')
    ) {
      const clickRes = AutonomousVoiceAgent.clickElement(text);
      if (clickRes.success) {
        setMessages(prev => [
          ...prev,
          {
            id: 'ai-' + Date.now(),
            sender: 'ai',
            text: `🎯 **Voice Click Executed:**\n\nI have clicked **"${clickRes.targetName}"** on your screen.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        soundFX.playSuccessTone();
        speakText(`Clicked ${clickRes.targetName}`);
        if (onShowToast) onShowToast(clickRes.message, 'success');
        return;
      }
    }

    // 2. Voice Typing & Dictation ("type ABC Corp in client name", "write 98765 in phone", etc.)
    if (
      lower.startsWith('type ') || 
      lower.startsWith('write in ') || 
      lower.startsWith('fill in ') || 
      lower.startsWith('enter ') || 
      lower.startsWith('dictate ') || 
      lower.startsWith('input ') ||
      lower.startsWith('put ')
    ) {
      let fieldHint = '';
      let textToType = text.replace(/^(type|write in|fill in|enter|dictate|input|put)\s+/i, '').trim();
      const inMatch = textToType.match(/(.+)\s+(?:in|into|for)\s+(?:the\s+)?([a-zA-Z0-9_\s]+)$/i);
      if (inMatch) {
        textToType = inMatch[1].trim();
        fieldHint = inMatch[2].trim();
      }

      const typeRes = AutonomousVoiceAgent.writeTextToField(textToType, fieldHint);
      if (typeRes.success) {
        setMessages(prev => [
          ...prev,
          {
            id: 'ai-' + Date.now(),
            sender: 'ai',
            text: `✍️ **Voice Typing Executed:**\n\nI have typed \`${typeRes.typedText}\` into **${typeRes.fieldName}**.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        soundFX.playSuccessTone();
        speakText(`Typed ${typeRes.typedText} into ${typeRes.fieldName}`);
        if (onShowToast) onShowToast(typeRes.message, 'success');
        return;
      }
    }

    // 3. Fallback: If an input element is actively focused and user spoke plain text to dictate
    const activeEl = document.activeElement;
    if (
      activeEl && 
      (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable) &&
      !activeEl.classList.contains('ai-assistant-input') // Don't redirect if typing directly in AI chat input
    ) {
      const typeRes = AutonomousVoiceAgent.writeTextToField(text);
      if (typeRes.success) {
        setMessages(prev => [
          ...prev,
          {
            id: 'ai-' + Date.now(),
            sender: 'ai',
            text: `✍️ **Live Dictation:**\n\nTyped into focused field **${typeRes.fieldName}**: \`${typeRes.typedText}\``,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        soundFX.playSuccessTone();
        speakText(`Typed into ${typeRes.fieldName}`);
        if (onShowToast) onShowToast(typeRes.message, 'success');
        return;
      }
    }

    try {
      const userEmail = localStorage.getItem('taxpro_user_email') || 'admin@taxpro.com';
      const firmName = localStorage.getItem('taxpro_firm_name') || 'TaxPro Advisory & Tax Associates';
      const firmTag = localStorage.getItem('taxpro_firm_tag') || 'TaxPro';
      const resolvedScreen = activeScreen || screenContext.activeItem || localStorage.getItem('taxpro_active_nav') || 'Dashboard';

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages.slice(-6),
          screenContext: { ...screenContext, activeItem: resolvedScreen, firmName, firmTag },
          firmName,
          firmTag,
          userEmail
        })
      });

      const data = await response.json();
      
      const textResp = data.textResponse || 'Command processed successfully.';
      const voiceResp = data.voiceResponse || textResp;

      // Handle UI Action if returned from AI Brain
      if (data.uiAction) {
        // Trigger live database sync event across all subscribed components
        window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

        if (data.uiAction.type === 'click_element') {
          AutonomousVoiceAgent.clickElement(data.uiAction.target);
        } else if (data.uiAction.type === 'type_text') {
          AutonomousVoiceAgent.writeTextToField(data.uiAction.text, data.uiAction.targetField);
        } else if (data.uiAction.type === 'navigate') {
          window.dispatchEvent(new CustomEvent('ai_navigate', { detail: data.uiAction.target }));
        } else if (data.uiAction.type === 'client_created' || data.uiAction.type === 'client_deleted') {
          window.dispatchEvent(new CustomEvent('ai_navigate', { detail: 'Clients' }));
          setTimeout(() => window.dispatchEvent(new CustomEvent('ai_client_added')), 150);
        } else if (data.uiAction.type === 'task_created' || data.uiAction.type === 'task_completed' || data.uiAction.type === 'task_deleted') {
          window.dispatchEvent(new CustomEvent('ai_navigate', { detail: 'Tasks' }));
          setTimeout(() => window.dispatchEvent(new CustomEvent('ai_task_added')), 150);
        } else if (data.uiAction.type === 'payment_created') {
          window.dispatchEvent(new CustomEvent('ai_navigate', { detail: 'Receipts & Payments' }));
        } else if (data.uiAction.type === 'fee_created' || data.uiAction.type === 'fee_paid') {
          window.dispatchEvent(new CustomEvent('ai_navigate', { detail: 'Fees Tracking' }));
        } else if (data.uiAction.type === 'project_created') {
          window.dispatchEvent(new CustomEvent('ai_navigate', { detail: 'Projects' }));
        } else if (data.uiAction.type === 'member_created') {
          window.dispatchEvent(new CustomEvent('ai_navigate', { detail: 'Team Members' }));
        } else if (data.uiAction.type === 'department_created') {
          window.dispatchEvent(new CustomEvent('ai_navigate', { detail: 'Departments' }));
        } else if (data.uiAction.type === 'attendance_logged') {
          window.dispatchEvent(new CustomEvent('ai_navigate', { detail: 'Dashboard' }));
        } else if (data.uiAction.type === 'message_sent') {
          window.dispatchEvent(new CustomEvent('ai_navigate', { detail: 'Private Chat' }));
        } else if (data.uiAction.type === 'open_modal') {
          if (data.uiAction.target) {
            window.dispatchEvent(new CustomEvent('ai_navigate', { detail: data.uiAction.target }));
          }
          if (data.uiAction.modal === 'add_client') {
            setTimeout(() => window.dispatchEvent(new CustomEvent('ai_open_add_client')), 150);
          } else if (data.uiAction.modal === 'add_task') {
            setTimeout(() => window.dispatchEvent(new CustomEvent('ai_open_add_task')), 150);
          }
        } else if (data.uiAction.type === 'present_data') {
          window.dispatchEvent(new CustomEvent('ai_navigate', { detail: 'AI Studio' }));
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('taxpro_ai_present', { detail: data.uiAction.payload }));
          }, 150);
        } else if (data.uiAction.type === 'search') {
          window.dispatchEvent(new CustomEvent('ai_search', { detail: data.uiAction.target }));
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: 'ai-' + Date.now(),
          sender: 'ai',
          text: textResp,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          cardType: data.toolCalled
        }
      ]);

      soundFX.playSuccessTone();
      speakText(voiceResp);

      if (data.success && onShowToast) {
        onShowToast(`🤖 Voice AI: Action Verified`, 'success');
      }
    } catch (err) {
      console.error('[Voice Assistant Execution Error]:', err);
      const fallbackVoice = "I couldn't complete that task. Please say again.";
      const fallbackText = `⚠️ **Task Incomplete**\n\nI couldn't complete that task. **Please say again**, or try asking:\n\n• *"Play daily briefing"*\n• *"Add new client"* / *"Add client [Company Name]"*\n• *"Add task [Title]"*\n• *"What is our revenue?"*`;
      setMessages((prev) => [
        ...prev,
        {
          id: 'ai-' + Date.now(),
          sender: 'ai',
          text: fallbackText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      speakText(fallbackVoice);
    }
  };

  // Live listener for Play Daily Briefing trigger
  useEffect(() => {
    const handleBriefing = () => {
      processCommand("Give me today's briefing");
    };
    window.addEventListener('ai_briefing', handleBriefing);
    return () => window.removeEventListener('ai_briefing', handleBriefing);
  }, [activeScreen]);

  // Draft Copy & Download Helpers
  const handleCopyDraft = (text) => {
    try {
      const codeMatch = text.match(/```(?:text)?\n([\s\S]*?)```/);
      const cleanToCopy = codeMatch ? codeMatch[1].trim() : text.replace(/[*_#`]/g, '').trim();
      navigator.clipboard.writeText(cleanToCopy);
      if (onShowToast) onShowToast('✓ Draft copied to clipboard!', 'success');
    } catch (e) {
      if (onShowToast) onShowToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleDownloadDraft = (text, defaultTitle = 'taxpro_draft') => {
    try {
      const codeMatch = text.match(/```(?:text)?\n([\s\S]*?)```/);
      const cleanToDownload = codeMatch ? codeMatch[1].trim() : text.replace(/[*_#`]/g, '').trim();
      const blob = new Blob([cleanToDownload], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${defaultTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.txt`;
      link.click();
      if (onShowToast) onShowToast('✓ Draft downloaded successfully.', 'success');
    } catch (e) {}
  };

  // Toggle Continuous Windows-Grade Voice Typing (Win+H Engine)
  const handleVoiceToggle = async (forceStart = false) => {
    const isForced = typeof forceStart === 'boolean' ? forceStart : false;

    // If already listening and not forced, stop
    if (aiState === 'LISTENING' && !isForced) {
      if (engineRef.current) {
        engineRef.current.stop();
      }
      setAiState('IDLE');
      setInterimTranscript('');
      setAudioLevel(0);
      return;
    }

    if (!WindowsVoiceEngine.isSupported()) {
      setIsSpeechSupported(false);
      if (onShowToast) onShowToast('Voice recognition is not supported in this browser. Please use Google Chrome or Edge.', 'warning');
      return;
    }

    try {
      interruptSpeech();

      if (engineRef.current) {
        engineRef.current.stop(false);
      }

      const engine = new WindowsVoiceEngine({
        lang: speechLang,
        silenceThresholdMs: 1400,
        onInterim: (text) => setInterimTranscript(text),
        onFinal: (text) => {
          setInterimTranscript('');
          setAudioLevel(0);
          if (text && text.trim().length > 1) {
            processCommand(text);
          }
        },
        onStateChange: (state) => setAiState(state),
        onAudioLevel: (lvl) => setAudioLevel(lvl),
        onError: (err) => {
          if (onShowToast) onShowToast(err.message, 'error');
          setAiState('IDLE');
        }
      });

      engineRef.current = engine;
      await engine.start();
    } catch (e) {
      console.error('[Windows Voice Typing Activation Error]:', e);
      setAiState('IDLE');
      if (onShowToast) onShowToast('Failed to start Windows Voice Typing engine.', 'error');
    }
  };

  // Keyboard shortcut listener for Ctrl+H / Alt+H (Windows Voice Typing simulator)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Hotkey: Ctrl+H or Alt+H to trigger voice typing
      if ((e.ctrlKey || e.altKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        handleVoiceToggle();
      }
      if (e.key === 'Escape' && aiState === 'LISTENING') {
        handleVoiceToggle();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [aiState, speechLang]);

  // Live listener for taxpro_start_voice trigger from floating pill
  useEffect(() => {
    const handleAutoVoice = () => {
      handleVoiceToggle(true);
    };
    const handleVoiceCommand = (e) => {
      if (e.detail && typeof e.detail === 'string' && e.detail.trim().length > 1) {
        processCommand(e.detail);
      } else {
        handleVoiceToggle(true);
      }
    };
    window.addEventListener('taxpro_start_voice', handleAutoVoice);
    window.addEventListener('taxpro_start_voice_command', handleVoiceCommand);
    return () => {
      window.removeEventListener('taxpro_start_voice', handleAutoVoice);
      window.removeEventListener('taxpro_start_voice_command', handleVoiceCommand);
      if (engineRef.current) {
        engineRef.current.stop(false);
      }
    };
  }, []);

  // Document Intelligence Upload Handler
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    if (onShowToast) onShowToast(`Analyzing ${file.name} with Document Intelligence...`, 'info');

    try {
      const result = await analyzeFinancialDocument(file);
      setMessages((prev) => [
        ...prev,
        {
          id: 'user-doc-' + Date.now(),
          sender: 'user',
          text: `📎 Uploaded Document: ${file.name}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        {
          id: 'ai-doc-' + Date.now(),
          sender: 'ai',
          text: result.summaryMarkdown,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      soundFX.playSuccessTone();
      speakText(result.voiceSummary);
    } catch (err) {
      if (onShowToast) onShowToast('Could not analyze document.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const sampleChips = [
    'Find photo of GST portal',
    'Show photo of Tax invoice',
    'Explain Section 80C deductions',
    'Give me today\'s briefing',
    'Print August 2026 report',
    'Download payments Excel',
    'Write GST notice reply',
    'What is our revenue?'
  ];

  // Helper to render rich markdown, images, and external links in AI message bubbles
  const renderMessageContent = (text, isUser = false) => {
    if (!text) return null;
    if (isUser) return <span>{text}</span>;

    // 1. Extract markdown images ![alt](url)
    const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = imageRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
      }
      parts.push({ type: 'image', title: match[1], url: match[2] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.substring(lastIndex) });
    }

    return (
      <div className="space-y-2">
        {parts.map((part, pIdx) => {
          if (part.type === 'image') {
            return (
              <div 
                key={`img-${pIdx}`} 
                className="my-2 rounded-xl overflow-hidden border border-white/15 bg-black/40 shadow-lg group relative transition-all hover:border-cyan-500/50"
              >
                <div 
                  onClick={() => setLightboxImage({ url: part.url, title: part.title })}
                  className="cursor-pointer overflow-hidden max-h-48 flex items-center justify-center bg-black/60 relative"
                >
                  <img 
                    src={part.url} 
                    alt={part.title || 'Visual Photo'} 
                    className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 justify-between">
                    <span className="text-[10px] font-bold text-white flex items-center gap-1">
                      <Search className="w-3 h-3 text-cyan-400" /> Click to Zoom
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                      High-Res
                    </span>
                  </div>
                </div>
                {part.title && (
                  <div className="p-2 bg-white/[0.04] border-t border-white/10 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold text-gray-200 truncate flex-1 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{part.title}</span>
                    </p>
                    <a
                      href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(part.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold shrink-0 flex items-center gap-1 hover:underline"
                    >
                      Google <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                )}
              </div>
            );
          }

          // Format Text Content (Links, Bold, Headers)
          const lines = part.content.split('\n');
          return (
            <div key={`txt-${pIdx}`} className="space-y-1">
              {lines.map((line, lIdx) => {
                if (!line.trim()) return <div key={lIdx} className="h-1" />;

                // Header check
                if (line.startsWith('### ')) {
                  return <h5 key={lIdx} className="font-bold text-cyan-300 text-xs mt-1.5 mb-0.5">{line.replace('### ', '')}</h5>;
                }
                if (line.startsWith('## ') || line.startsWith('# ')) {
                  return <h4 key={lIdx} className="font-extrabold text-white text-xs mt-2 mb-1 border-b border-white/10 pb-0.5">{line.replace(/^#+\s*/, '')}</h4>;
                }

                // Parse Markdown Links [text](url)
                const linkRegex = /\[(.*?)\]\((.*?)\)/g;
                let renderedLine = [];
                let linkLastIdx = 0;
                let linkMatch;

                while ((linkMatch = linkRegex.exec(line)) !== null) {
                  if (linkMatch.index > linkLastIdx) {
                    renderedLine.push(line.substring(linkLastIdx, linkMatch.index));
                  }
                  const linkTitle = linkMatch[1];
                  const linkHref = linkMatch[2];
                  renderedLine.push(
                    <a
                      key={`lnk-${lIdx}-${linkMatch.index}`}
                      href={linkHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 my-0.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 hover:text-white border border-cyan-500/30 text-[10px] font-bold transition-all shadow-2xs"
                    >
                      <Globe className="w-2.5 h-2.5 text-cyan-400" />
                      <span>{linkTitle}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-gray-400" />
                    </a>
                  );
                  linkLastIdx = linkMatch.index + linkMatch[0].length;
                }
                if (linkLastIdx < line.length) {
                  renderedLine.push(line.substring(linkLastIdx));
                }

                return (
                  <p key={lIdx} className="leading-relaxed">
                    {renderedLine.map((item, iIdx) => {
                      if (typeof item !== 'string') return item;
                      // Handle **bold**
                      const boldParts = item.split(/\*\*(.*?)\*\*/g);
                      if (boldParts.length > 1) {
                        return boldParts.map((bp, bIdx) =>
                          bIdx % 2 === 1 ? <strong key={bIdx} className="text-white font-bold">{bp}</strong> : bp
                        );
                      }
                      return item;
                    })}
                  </p>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  if (!isOpen) return null;

  if (!isOpen) return null;

  // Calculate 5 waveform bar heights based on live decibels inside the proper box
  const barHeights = [
    Math.max(4, Math.min(18, Math.round(audioLevel * 0.18))),
    Math.max(6, Math.min(24, Math.round(audioLevel * 0.26))),
    Math.max(8, Math.min(28, Math.round(audioLevel * 0.32))),
    Math.max(6, Math.min(24, Math.round(audioLevel * 0.26))),
    Math.max(4, Math.min(18, Math.round(audioLevel * 0.18)))
  ];

  return (
    <>
      <div 
        style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
        className={`fixed bottom-6 right-6 z-50 transition-all duration-300 animate-siri-open rounded-3xl overflow-hidden flex flex-col siri-gemini-chassis border border-white/10 ${
          isExpanded ? 'w-[92vw] max-w-2xl h-[86vh]' : 'w-full max-w-sm sm:max-w-md h-[610px]'
        }`}
      >
        {/* Siri / Gemini Fluid Outer Chromatic Ring Accent */}
        <div className="absolute -inset-[1px] rounded-3xl siri-chromatic-ring opacity-30 blur-[2px] pointer-events-none -z-10" />
        
        {/* PROPER AI ASSISTANT MENU BAR & CONTROL BOX */}
        <div className="bg-white/[0.04] border-b border-white/10 select-none flex flex-col relative z-10">
          
          {/* Header Row: Identity, Screen Context & Window Controls */}
          <div 
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="px-4 py-3 flex items-center justify-between cursor-grab active:cursor-grabbing border-b border-white/5"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-emerald-400 p-[1.5px] shadow-md shadow-cyan-500/30">
                  <div className="w-full h-full bg-black/90 rounded-xl flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  </div>
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0b0c16] ${
                  aiState === 'LISTENING' ? 'bg-red-400 animate-ping' : (aiState === 'SPEAKING' ? 'bg-emerald-400 animate-pulse' : (aiState === 'THINKING' ? 'bg-amber-400 animate-spin' : 'bg-cyan-400'))
                }`} />
              </div>

              <div>
                <h4 className="text-xs font-bold text-white font-outfit flex items-center gap-1.5 flex-wrap">
                  <span>TaxPro AI Assistant</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono font-bold flex items-center gap-1">
                    <Layers className="w-2.5 h-2.5 text-cyan-400" />
                    <span>{activeScreen}</span>
                  </span>
                </h4>
                <p className="text-[9px] text-gray-400 font-mono flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    aiState === 'LISTENING' ? 'bg-red-400' : (aiState === 'SPEAKING' ? 'bg-emerald-400' : (aiState === 'THINKING' ? 'bg-amber-400' : 'bg-cyan-400'))
                  }`} />
                  <span>
                    {aiState === 'LISTENING' && '🎙️ Listening (Win+H Engine)'}
                    {aiState === 'THINKING' && '⚙️ Processing Autonomous Action...'}
                    {aiState === 'SPEAKING' && '🔊 Speaking (Tap Orb to Mute)'}
                    {aiState === 'IDLE' && 'Live SQL • Autonomous Ready'}
                  </span>
                </p>
              </div>
            </div>

            {/* Header Controls */}
            <div className="flex items-center gap-1">
              
              {/* Language Switcher */}
              <button
                onClick={() => {
                  const next = speechLang === 'en-IN' ? 'en-US' : 'en-IN';
                  setSpeechLang(next);
                  if (onShowToast) onShowToast(`Voice Engine: ${next === 'en-IN' ? 'English (India)' : 'English (US)'}`, 'info');
                }}
                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-mono font-bold text-cyan-300 flex items-center gap-1 transition-all cursor-pointer"
                title="Toggle Speech Recognition Accent (EN-IN / EN-US)"
              >
                <Globe className="w-2.5 h-2.5" />
                {speechLang.toUpperCase()}
              </button>

              {/* Voice Sound Output Toggle */}
              <button
                onClick={() => {
                  setVoiceSoundEnabled(!voiceSoundEnabled);
                  interruptSpeech();
                }}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  voiceSoundEnabled ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' : 'bg-white/5 text-gray-500 border-white/5'
                }`}
                title={voiceSoundEnabled ? 'Mute Voice Output' : 'Enable Voice Output'}
              >
                {voiceSoundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
              </button>

              {/* Expand / Minimize Window Toggle */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title={isExpanded ? 'Restore Size' : 'Maximize Window'}
              >
                {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              </button>

              {/* Close Assistant */}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close Assistant"
              >
                <X className="w-3.5 h-3.5" />
              </button>

            </div>
          </div>

          {/* Operation Menu Bar: Master Voice Controls & Autonomous Modes */}
          <div className="px-3.5 py-2 bg-black/40 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
            
            {/* Master Voice Typing Toggle with Live Waveform */}
            <button
              onClick={() => handleVoiceToggle()}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                aiState === 'LISTENING'
                  ? 'bg-red-500 text-white shadow-red-500/30 animate-pulse'
                  : 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-indigo-500/20 hover:scale-102'
              }`}
              title={aiState === 'LISTENING' ? 'Listening Active... Click to Stop' : 'Start Windows Voice Typing (Win+H Mode)'}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{aiState === 'LISTENING' ? 'Listening...' : 'Voice Typing'}</span>
              
              {/* Mini Audio Decibel Bars */}
              {aiState === 'LISTENING' && (
                <div className="flex items-center gap-0.5 h-4 px-1">
                  {barHeights.map((h, i) => (
                    <div 
                      key={i} 
                      style={{ height: `${h}px` }} 
                      className="w-0.5 bg-white rounded-full transition-all duration-75"
                    />
                  ))}
                </div>
              )}
            </button>

            {/* Autonomous Action Modes */}
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-gray-300 flex items-center gap-1" title="Say 'Click [Button Name]' to click any item on screen">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                🎯 Click Anywhere
              </span>
              <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-gray-300 flex items-center gap-1" title="Say 'Type [Text] in [Field]' or speak into active input">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                ✍️ Form Typing
              </span>
              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono font-bold text-gray-400">
                Ctrl+H
              </span>
            </div>

          </div>

          {/* Live Streaming Speech Banner (When Listening) */}
          {aiState === 'LISTENING' && (
            <div className="px-4 py-2 bg-indigo-950/60 border-t border-indigo-500/30 flex items-center gap-2 animate-fade-in">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-spin flex-shrink-0" />
              <p className="text-xs text-white font-medium truncate flex-1">
                {interimTranscript ? (
                  <span>"{interimTranscript}" <span className="inline-block w-1.5 h-3 bg-cyan-400 animate-pulse ml-0.5" /></span>
                ) : (
                  <span className="text-gray-300">Speak naturally... e.g. <em>"Click Add Client"</em> or <em>"Type Apex Logistics"</em></span>
                )}
              </p>
            </div>
          )}

        </div>

        {/* 60 FPS QUANTUM SOUNDWAVE VISUALIZER ORB HERO */}
        <div 
          onClick={interruptSpeech}
          className="relative py-2 bg-gradient-to-b from-white/[0.02] to-transparent flex flex-col items-center justify-center border-b border-white/5 cursor-pointer"
          title={aiState === 'SPEAKING' ? 'Click to interrupt speech' : ''}
        >
          <VoiceVisualizerCanvas 
            isListening={aiState === 'LISTENING'} 
            isSpeaking={aiState === 'SPEAKING'} 
            audioStream={audioStream} 
            size={isExpanded ? 130 : 95} 
          />
          
          <div className="text-center -mt-2 mb-1">
            <p className="text-[11px] font-mono font-semibold text-gray-300 flex items-center justify-center gap-1.5">
              {aiState === 'LISTENING' ? (
                <span className="text-cyan-300 animate-pulse flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  Listening to your voice with Auto-VAD...
                </span>
              ) : (
                <span className="text-gray-400">Say <strong className="text-cyan-300">"Hey TaxPro"</strong> or click Voice Typing</span>
              )}
            </p>
          </div>
        </div>

        {/* CONVERSATION MESSAGES FEED */}
        <div 
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 p-4 overflow-y-auto space-y-3.5 scrollbar-thin scrollbar-thumb-white/10 overscroll-contain relative"
        >
          {/* Floating Jump to Latest Button (when user scrolls up) */}
          {isUserScrolledUp && (
            <div className="sticky top-1 z-20 flex justify-center w-full pointer-events-none mb-2">
              <button
                type="button"
                onClick={() => {
                  setIsUserScrolledUp(false);
                  scrollToBottom('smooth');
                }}
                className="pointer-events-auto px-3 py-1 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-[10px] font-bold shadow-xl backdrop-blur-md flex items-center gap-1.5 transition-all animate-bounce cursor-pointer border border-cyan-400/40"
                title="Scroll down to newest question and response"
              >
                <ArrowDown className="w-3 h-3 text-cyan-200" />
                <span>Jump to latest</span>
              </button>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-xs shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-cyan-500 text-black font-bold shadow-cyan-500/20'
                    : 'bg-white/10 text-cyan-300 border border-white/10'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              
              <div
                className={`p-3 rounded-2xl max-w-[84%] text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-tr-none font-medium shadow-lg shadow-cyan-500/20'
                    : 'bg-white/[0.05] border border-white/10 text-gray-200 rounded-tl-none font-sans'
                }`}
              >
                {renderMessageContent(msg.text, msg.sender === 'user')}

                {/* Interactive Action Bar for Drafted Text / Letters / Memos */}
                {(msg.cardType === 'write_text' || (msg.text && msg.text.includes('```'))) && msg.sender === 'ai' && (
                  <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleCopyDraft(msg.text)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy Draft</span>
                    </button>

                    <button
                      onClick={() => handleDownloadDraft(msg.text)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-[10px] font-medium transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Save .txt</span>
                    </button>

                    <button
                      onClick={() => speakText(msg.text)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-cyan-300 text-[10px] transition-colors cursor-pointer"
                      title="Read Aloud"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div className={`text-[9px] mt-1.5 opacity-60 ${msg.sender === 'user' ? 'text-right' : 'text-left font-mono'}`}>
                  {msg.time}
                </div>
              </div>
            </div>
          ))}

          {/* Real-time Interim Streaming Transcript */}
          {interimTranscript && (
            <div className="flex items-start gap-2.5 flex-row-reverse animate-pulse">
              <div className="w-7 h-7 rounded-xl bg-cyan-500/30 text-cyan-300 flex items-center justify-center flex-shrink-0 text-xs">
                <Mic className="w-3.5 h-3.5" />
              </div>
              <div className="p-3 rounded-2xl max-w-[84%] text-xs bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 rounded-tr-none italic font-mono">
                {interimTranscript}...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 1-CLICK QUICK ACTION CHIPS */}
        <div className="px-4 py-2 border-t border-white/5 bg-black/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {sampleChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => processCommand(chip)}
              className="flex-shrink-0 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-gray-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/40 text-[10px] font-medium transition-all shadow-sm cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* INPUT, DOCUMENT UPLOAD & MICROPHONE CONTROLS */}
        <div className="p-3 bg-white/[0.02] border-t border-white/10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              processCommand();
            }}
            className="flex items-center gap-2"
          >
            {/* File / Document Intelligence Upload */}
            <label 
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-cyan-500/20 text-gray-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/30 cursor-pointer transition-all flex items-center justify-center"
              title="Upload Document for OCR & Intelligence"
            >
              <Paperclip className="w-4 h-4" />
              <input 
                type="file" 
                className="hidden" 
                onChange={handleFileUpload} 
                accept=".pdf,.docx,.xlsx,.csv,.png,.jpg,.jpeg,.txt"
              />
            </label>

            {/* Text Input Box */}
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Ask questions, type into fields, click buttons (Ctrl+H)..."
              className="ai-assistant-input flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-500/50 transition-colors font-sans"
            />

            {/* Voice Mic Toggle */}
            <button
              type="button"
              onClick={handleVoiceToggle}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                aiState === 'LISTENING'
                  ? 'bg-red-500 text-white border-red-400 shadow-lg shadow-red-500/30 animate-pulse'
                  : 'bg-white/5 hover:bg-cyan-500/20 text-gray-300 hover:text-cyan-300 border-white/10 hover:border-cyan-500/30'
              }`}
              title={aiState === 'LISTENING' ? 'Listening... Tap to stop' : 'Start Voice Listening'}
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Send Submit Button */}
            <button
              type="submit"
              disabled={!inputMsg.trim()}
              className="p-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black hover:text-white font-bold transition-all shadow-md shadow-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* LIGHTBOX IMAGE ZOOM MODAL */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div 
            onClick={e => e.stopPropagation()} 
            className="bg-[#0e101c] border border-cyan-500/40 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-modal-smooth"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs sm:text-sm font-bold text-white font-outfit truncate max-w-md">{lightboxImage.title || 'Photo Preview'}</h4>
              </div>
              <button onClick={() => setLightboxImage(null)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex-1 flex items-center justify-center bg-black/70 overflow-hidden min-h-[300px]">
              <img src={lightboxImage.url} alt={lightboxImage.title} className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-2xl" />
            </div>
            <div className="p-4 border-t border-white/10 flex items-center justify-between bg-black/40 gap-3">
              <a 
                href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(lightboxImage.title || 'Tax and Finance')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Search className="w-3.5 h-3.5" /> View on Google Images
              </a>
              <a 
                href={lightboxImage.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                download
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Full Resolution
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
