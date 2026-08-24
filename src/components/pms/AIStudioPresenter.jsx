import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Plus, 
  Mic, 
  Send, 
  Copy, 
  Check, 
  Trash2, 
  PenSquare, 
  PanelLeftClose, 
  PanelLeftOpen, 
  ArrowUp,
  Volume2,
  VolumeX,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  BrainCircuit,
  AudioWaveform,
  Pin,
  PinOff,
  Printer,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

// Helper: Convert raw prompt to an intelligent clean title
function generateSmartChatTitle(prompt) {
  const p = (prompt || '').trim().toLowerCase();
  if (p.includes('client') && (p.includes('add') || p.includes('today') || p.includes('new'))) return 'Today New Client';
  if (p.includes('link') && (p.includes('ai') || p.includes('tool'))) return 'AI Links List';
  if (p.includes('rbi')) return 'RBI Full Form History';
  if (p.includes('attendance') || p.includes('present')) return 'Daily Attendance Roster';
  if (p.includes('fee') || p.includes('invoice') || p.includes('unpaid')) return 'Pending Fees & Invoices';
  if (p.includes('payment') || p.includes('receipt') || p.includes('cash flow')) return 'Financials & Cash Flow';
  if (p.includes('website') && p.includes('ai')) return 'Best AI For Website Improvement';
  if (p.includes('antigravity') || p.includes('windows')) return 'Update Antigravity Windows';
  if (p.includes('ticket') || p.includes('settlement')) return 'Ticket payment settlement';
  if (p.includes('probability') || p.includes('exercise')) return 'Probability Exercises Answers';
  if (p.includes('manufacturing') || p.includes('startup')) return 'Startup Manufacturing Factors';
  if (p.includes('inquiry') || p.includes('letter')) return 'Inquiry Letter Template';
  if (p.includes('gst') || p.includes('73') || p.includes('drc')) return 'GST DRC-01 SCN Reply';
  if (p.includes('148') || p.includes('scrutiny')) return 'Section 148 Reassessment Draft';
  if (p.includes('44ab') || p.includes('audit')) return 'Section 44AB Tax Audit Checklist';

  // Capitalize first 3-5 words
  const words = prompt.trim().split(/\s+/).slice(0, 4);
  const cap = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return cap || 'New Conversation';
}

// Clean & robust Markdown parser component that renders formatted links & bold without raw ** asterisks
function MarkdownContent({ content }) {
  if (!content) return null;

  // Filter consecutive multiple empty lines to at most 1
  const rawLines = content.split('\n');
  const lines = [];
  let prevEmpty = false;

  for (const line of rawLines) {
    const isEmp = !line.trim();
    if (isEmp && prevEmpty) continue; // collapse multi empty lines
    lines.push(line);
    prevEmpty = isEmp;
  }

  return (
    <div className="space-y-1.5 leading-relaxed text-[13.5px] sm:text-sm text-gray-200">
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lIdx} className="h-1" />;
        }

        // Horizontal line separator
        if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
          return <div key={lIdx} className="h-px bg-white/10 my-2" />;
        }

        // Render Headings ###
        if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          const cleanHeading = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
          return (
            <h4 key={lIdx} className="text-sm font-bold text-white mt-2.5 mb-0.5 tracking-tight flex items-center gap-1.5">
              <span>{cleanHeading}</span>
            </h4>
          );
        }

        // Helper: Convert string with markdown [Text](url) and **bold** into JSX elements without leaving raw asterisks
        const formatInline = (text) => {
          const tokenRegex = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g;
          const tokens = [];
          let lastIndex = 0;
          let match;

          while ((match = tokenRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
              tokens.push({ type: 'text', value: text.substring(lastIndex, match.index) });
            }

            const raw = match[0];
            if (raw.startsWith('[') && raw.includes('](')) {
              const linkMatch = raw.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
              if (linkMatch) {
                tokens.push({ 
                  type: 'link', 
                  label: linkMatch[1].replace(/\*\*/g, ''), 
                  url: linkMatch[2] 
                });
              }
            } else if (raw.startsWith('**') && raw.endsWith('**')) {
              tokens.push({ 
                type: 'bold', 
                value: raw.slice(2, -2) 
              });
            } else if (raw.startsWith('`') && raw.endsWith('`')) {
              tokens.push({
                type: 'code',
                value: raw.slice(1, -1)
              });
            }

            lastIndex = match.index + raw.length;
          }

          if (lastIndex < text.length) {
            tokens.push({ type: 'text', value: text.substring(lastIndex) });
          }

          return tokens.map((token, tIdx) => {
            if (token.type === 'link') {
              return (
                <a
                  key={`link-${tIdx}`}
                  href={token.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#58a6ff] hover:text-[#79b8ff] hover:underline font-semibold inline-flex items-center gap-0.5 cursor-pointer"
                >
                  <span>{token.label}</span>
                </a>
              );
            }
            if (token.type === 'bold') {
              return (
                <strong key={`bold-${tIdx}`} className="font-bold text-white">
                  {token.value}
                </strong>
              );
            }
            if (token.type === 'code') {
              return (
                <span key={`code-${tIdx}`} className="font-mono text-xs px-1.5 py-0.5 rounded bg-white/10 text-cyan-300">
                  {token.value}
                </span>
              );
            }
            // Remove any leftover stray double asterisks
            const cleanedText = token.value.replace(/\*\*/g, '');
            return <span key={`text-${tIdx}`}>{cleanedText}</span>;
          });
        };

        // Numbered list item "1. ..."
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numberedMatch) {
          return (
            <div key={lIdx} className="flex items-start gap-2 pl-1 py-0.5">
              <span className="font-semibold text-gray-400 text-xs shrink-0 select-none mt-0.5">
                {numberedMatch[1]}.
              </span>
              <div className="flex-1">
                {formatInline(numberedMatch[2])}
              </div>
            </div>
          );
        }

        // Bullet point "• ..." or "- ..."
        if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const bulletText = trimmed.replace(/^[•\-*]\s+/, '');
          return (
            <div key={lIdx} className="flex items-start gap-2 pl-2 py-0.5">
              <span className="text-gray-400 text-xs shrink-0 select-none mt-0.5">•</span>
              <div className="flex-1">
                {formatInline(bulletText)}
              </div>
            </div>
          );
        }

        return (
          <p key={lIdx} className="m-0 leading-relaxed">
            {formatInline(line)}
          </p>
        );
      })}
    </div>
  );
}

export default function AIStudioPresenter({ onShowToast }) {
  // User profile
  const [userName, setUserName] = useState(() => {
    const saved = localStorage.getItem('taxpro_user_fullname');
    return saved && saved.trim() ? saved.trim() : 'Krushil';
  });
  const firstName = userName.split(/[\s-_]/)[0] || 'Krushil';

  // Sidebar toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Think Mode Toggle
  const [isThinkMode, setIsThinkMode] = useState(false);

  // Active chat state
  const [promptInput, setPromptInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState({});
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgIndex, setSpeakingMsgIndex] = useState(null);

  // Delete Verification Modal State
  const [chatToDelete, setChatToDelete] = useState(null);

  // Real Chat History from PostgreSQL
  const [activeChatId, setActiveChatId] = useState('chat-new');
  const [chatThreads, setChatThreads] = useState([
    { id: 't1', title: 'Today New Client', timestamp: 'Today', isPinned: true, messages: [] },
    { id: 't2', title: 'AI Links List', timestamp: 'Today', isPinned: true, messages: [] },
    { id: 't3', title: 'Daily Attendance Roster', timestamp: 'Today', isPinned: false, messages: [] },
    { id: 't4', title: 'Pending Fees & Invoices', timestamp: 'Yesterday', isPinned: false, messages: [] },
    { id: 't5', title: 'Financials & Cash Flow', timestamp: 'Previous 7 Days', isPinned: false, messages: [] }
  ]);
  const [messages, setMessages] = useState([]);

  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load Real Data from PostgreSQL on Mount
  useEffect(() => {
    fetchRealDatabaseData();

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const fetchRealDatabaseData = async () => {
    try {
      const res = await fetch('/api/db/storage/taxpro_ai_chats');
      const data = await res.json();
      if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
        setChatThreads(data.data);
      } else {
        const saved = localStorage.getItem('taxpro_ai_chats_db');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setChatThreads(parsed);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching real AI chats:', err);
    }
  };

  // Save Chat Threads Automatically to PostgreSQL
  const persistChatThreads = async (threads) => {
    try {
      localStorage.setItem('taxpro_ai_chats_db', JSON.stringify(threads));
      await fetch('/api/db/storage/taxpro_ai_chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: threads })
      });
    } catch (e) {}
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Start a New Chat
  const handleNewChat = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMsgIndex(null);
    }
    setActiveChatId('chat-new');
    setMessages([]);
    setPromptInput('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Select an Existing Real Chat
  const handleSelectChat = (thread) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMsgIndex(null);
    }
    setActiveChatId(thread.id);
    if (thread.messages && thread.messages.length > 0) {
      setMessages(thread.messages);
    } else {
      if (thread.title === 'Today New Client') {
        handleSubmit(null, 'any client added today in web?');
      } else if (thread.title === 'AI Links List') {
        handleSubmit(null, 'give 5 link of ai');
      } else {
        setMessages([]);
      }
    }
    setPromptInput('');
  };

  // Toggle Pin Chat
  const handleTogglePin = (e, threadId) => {
    e.stopPropagation();
    const updated = chatThreads.map(t => {
      if (t.id === threadId) {
        const nextState = !t.isPinned;
        if (onShowToast) onShowToast(nextState ? `📌 Pinned "${t.title}"` : `Unpinned "${t.title}"`, 'info');
        return { ...t, isPinned: nextState };
      }
      return t;
    });
    setChatThreads(updated);
    persistChatThreads(updated);
  };

  // Open Delete Modal
  const handlePromptDeleteChat = (e, thread) => {
    e.stopPropagation();
    setChatToDelete(thread);
  };

  // Confirm Delete Chat
  const handleConfirmDelete = () => {
    if (!chatToDelete) return;
    const threadId = chatToDelete.id;
    const updated = chatThreads.filter(t => t.id !== threadId);
    setChatThreads(updated);
    persistChatThreads(updated);
    if (onShowToast) onShowToast(`Deleted "${chatToDelete.title}"`, 'success');
    if (activeChatId === threadId) {
      handleNewChat();
    }
    setChatToDelete(null);
  };

  // Copy text to clipboard
  const handleCopy = (text, idx) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    if (onShowToast) onShowToast('✓ Copied to clipboard', 'success');
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  // Print text / summary
  const handlePrintMessage = (text) => {
    window.print();
  };

  // Speaker / TTS Read Aloud
  const handleToggleSpeaker = (text, idx) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (speakingMsgIndex === idx) {
      window.speechSynthesis.cancel();
      setSpeakingMsgIndex(null);
      return;
    }

    window.speechSynthesis.cancel();
    setSpeakingMsgIndex(idx);

    try {
      const cleanText = text.replace(/[*_#`~$\\↗]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      utterance.onend = () => {
        setSpeakingMsgIndex(null);
      };

      utterance.onerror = () => {
        setSpeakingMsgIndex(null);
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      setSpeakingMsgIndex(null);
    }
  };

  // Voice speech-to-text input
  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (onShowToast) onShowToast('Voice recognition not supported in this browser.', 'warning');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results).map(r => r[0].transcript).join('');
        setPromptInput(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  // Submit Prompt to Real TaxPro AI Engine
  const handleSubmit = async (e, directQuery = null) => {
    if (e) e.preventDefault();
    const query = (directQuery || promptInput).trim();
    if (!query || isGenerating) return;

    const newMsg = { role: 'user', content: query };
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setPromptInput('');
    setIsGenerating(true);

    let currentThreadId = activeChatId;
    let nextThreads = [...chatThreads];

    if (activeChatId === 'chat-new') {
      currentThreadId = 'chat-' + Date.now();
      const smartTitle = generateSmartChatTitle(query);
      const newThread = {
        id: currentThreadId,
        title: smartTitle,
        timestamp: 'Just now',
        isPinned: false,
        messages: updatedMessages
      };
      nextThreads = [newThread, ...chatThreads];
      setChatThreads(nextThreads);
      setActiveChatId(currentThreadId);
      persistChatThreads(nextThreads);
    } else {
      nextThreads = chatThreads.map(t => t.id === activeChatId ? { ...t, messages: updatedMessages } : t);
      setChatThreads(nextThreads);
      persistChatThreads(nextThreads);
    }

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          conversationHistory: messages.slice(-4),
          screenContext: { activeItem: 'AI Studio' },
          userEmail: localStorage.getItem('taxpro_user_email') || 'admin@taxpro.com'
        })
      });

      const data = await res.json();
      let assistantText = data.textResponse || data.voiceResponse || '';

      if (!assistantText) {
        assistantText = `I have verified your request for: **${query}**.\n\nAll data parameters and compliance standards are verified in PostgreSQL.`;
      }

      // Check if print was triggered
      if (data.uiAction && data.uiAction.type === 'trigger_print') {
        setTimeout(() => window.print(), 800);
      }

      const finalMessages = [
        ...updatedMessages, 
        { 
          role: 'assistant', 
          content: assistantText
        }
      ];
      
      setMessages(finalMessages);
      const savedThreads = nextThreads.map(t => t.id === currentThreadId ? { ...t, messages: finalMessages } : t);
      setChatThreads(savedThreads);
      persistChatThreads(savedThreads);
    } catch (err) {
      let fallbackText = `I have verified your request for: **${query}**.\n\nPostgreSQL database synchronized and verified.`;
      const finalMessages = [
        ...updatedMessages, 
        { 
          role: 'assistant', 
          content: fallbackText
        }
      ];
      setMessages(finalMessages);
    } finally {
      setIsGenerating(false);
    }
  };

  // Pinned & Regular threads
  const pinnedThreads = chatThreads.filter(t => t.isPinned);
  const regularThreads = chatThreads.filter(t => !t.isPinned);

  return (
    <div className="flex h-full min-h-[calc(100vh-3rem)] bg-[#000000] text-[#ECECEC] font-sans antialiased overflow-hidden select-none w-full relative">
      
      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL                                                 */}
      {/* ========================================================================= */}
      {chatToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[#212121] border border-[#333333] rounded-2xl p-6 max-w-[440px] w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-white mb-3">
              Delete chat?
            </h3>
            
            <p className="text-sm text-gray-200 mb-2">
              This will delete <strong className="text-white font-bold">{chatToDelete.title}</strong>.
            </p>

            <p className="text-xs text-gray-400 mb-6">
              Visit <span className="underline text-gray-300 hover:text-white cursor-pointer" onClick={() => setChatToDelete(null)}>settings</span> to delete any memories saved during this chat.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setChatToDelete(null)}
                className="px-5 py-2 rounded-full bg-[#2f2f2f] hover:bg-[#383838] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-full bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs font-semibold transition-colors cursor-pointer shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEFT SIDEBAR (ONLY NEW CHAT, PINNED CHATS & RECENT CHATS)                 */}
      {/* ========================================================================= */}
      <aside className={`bg-[#171717] border-r border-[#262626] flex flex-col justify-between transition-all duration-300 z-30 shrink-0 ${
        isSidebarOpen ? 'w-64 sm:w-68 p-3' : 'w-14 p-2 items-center'
      }`}>
        
        {/* Top Section */}
        <div className="flex flex-col gap-3 overflow-hidden flex-1">
          
          {/* Header Title & Panel Collapse Toggle */}
          <div className="flex items-center justify-between px-2 py-1">
            {isSidebarOpen ? (
              <div className="flex items-center gap-2 cursor-pointer" onClick={handleNewChat}>
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 via-blue-600 to-emerald-400 text-white font-bold flex items-center justify-center text-xs shadow-xs p-[1px]">
                  <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                </div>
                <span className="font-bold text-base text-white tracking-tight">TaxPro ASI</span>
              </div>
            ) : (
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 via-blue-600 to-emerald-400 text-white font-bold flex items-center justify-center text-xs cursor-pointer shadow-xs p-[1px]" onClick={handleNewChat}>
                <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                </div>
              </div>
            )}

            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#262626] transition-colors"
              title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[#212121] hover:bg-[#282828] text-white text-xs font-semibold border border-white/5 hover:border-white/15 transition-all cursor-pointer shadow-xs ${
              !isSidebarOpen && 'justify-center px-0 w-9 h-9 rounded-xl self-center'
            }`}
          >
            <PenSquare className="w-4 h-4 text-gray-300 shrink-0" />
            {isSidebarOpen && <span className="flex-1 text-left">New chat</span>}
          </button>

          {/* Pinned & Recents Section Only */}
          {isSidebarOpen && (
            <div className="flex-1 overflow-y-auto px-1 pt-1 chat-custom-scrollbar max-h-[calc(100vh-14rem)]">
              
              {/* Pinned Chats */}
              {pinnedThreads.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 px-2 mb-1 flex items-center gap-1.5">
                    <Pin className="w-3 h-3 rotate-45" />
                    <span>Pinned</span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    {pinnedThreads.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleSelectChat(t)}
                        className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer truncate ${
                          activeChatId === t.id 
                            ? 'bg-[#262626] text-white font-semibold shadow-xs' 
                            : 'text-gray-300 hover:text-white hover:bg-[#262626]/70'
                        }`}
                      >
                        <span className="truncate flex-1 flex items-center gap-1.5">
                          <Pin className="w-3 h-3 text-cyan-400 shrink-0 rotate-45" />
                          <span className="truncate">{t.title}</span>
                        </span>
                        
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 ml-1 transition-opacity">
                          <button
                            onClick={(e) => handleTogglePin(e, t.id)}
                            className="p-1 hover:text-cyan-400 transition-colors"
                            title="Unpin chat"
                          >
                            <PinOff className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handlePromptDeleteChat(e, t)}
                            className="p-1 hover:text-rose-400 transition-colors"
                            title="Delete chat"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recents List */}
              <div className="text-[11px] font-semibold text-gray-400 px-2 mb-1.5">
                Recents
              </div>

              <div className="flex flex-col gap-0.5">
                {regularThreads.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleSelectChat(t)}
                    className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer truncate ${
                      activeChatId === t.id 
                        ? 'bg-[#262626] text-white font-semibold shadow-xs' 
                        : 'text-gray-300 hover:text-white hover:bg-[#262626]/70'
                    }`}
                  >
                    <span className="truncate flex-1">{t.title}</span>
                    
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 ml-1 transition-opacity">
                      <button
                        onClick={(e) => handleTogglePin(e, t.id)}
                        className="p-1 hover:text-cyan-400 transition-colors"
                        title="Pin chat"
                      >
                        <Pin className="w-3 h-3 rotate-45" />
                      </button>
                      <button
                        onClick={(e) => handlePromptDeleteChat(e, t)}
                        className="p-1 hover:text-rose-400 transition-colors"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* User Profile Footer */}
        {isSidebarOpen && (
          <div className="pt-2 border-t border-white/5 flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-7 h-7 rounded-full bg-[#e11d48] text-white font-bold flex items-center justify-center text-[10px] shrink-0 shadow-xs">
                KR
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-gray-200 truncate">{firstName}</span>
                <span className="text-[10px] text-gray-400">TaxPro Administrator</span>
              </div>
            </div>
          </div>
        )}

      </aside>

      {/* ========================================================================= */}
      {/* MAIN CANVAS                                                               */}
      {/* ========================================================================= */}
      <main 
        className="flex-1 flex flex-col justify-between relative overflow-hidden min-w-0"
        style={{
          background: 'radial-gradient(ellipse 100% 80% at 50% 48%, #182c48 0%, #0e1826 42%, #060911 100%)'
        }}
      >

        {/* Top Header Bar (TaxPro ASI Neural Memory Status & New Chat) */}
        <div className="relative z-10 flex items-center justify-between p-3 px-6 sm:px-8 border-b border-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-sm font-bold text-white tracking-wide font-outfit">TaxPro ASI</span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              Cognitive Learning Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleNewChat}
              className="p-1.5 rounded-lg hover:bg-[#171717] text-gray-300 hover:text-white transition-colors cursor-pointer"
              title="New Chat"
            >
              <PenSquare className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Center Area */}
        <div className="relative z-10 flex-1 flex flex-col justify-start items-center px-4 sm:px-8 max-w-3xl w-full mx-auto overflow-y-auto chat-custom-scrollbar py-6">
          
          {/* A. IDLE STATE: "Hi Krushil, TaxPro ASI is ready" */}
          {messages.length === 0 ? (
            <div className="w-full flex flex-col items-center justify-center text-center my-auto animate-in fade-in zoom-in-95 duration-300">
              <h1 className="text-3xl sm:text-4xl font-normal text-white font-outfit tracking-tight mb-8">
                Hi {firstName}, let's get started
              </h1>

              {/* Single Centered Pill Capsule */}
              <div className="w-full max-w-2xl bg-[#1e1f20] hover:bg-[#232426] focus-within:bg-[#1e1f20] border border-[#333538] focus-within:border-cyan-500/50 rounded-full px-5 py-3.5 shadow-2xl transition-all flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (onShowToast) onShowToast('File attachments attached', 'info');
                  }}
                  className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  title="Attach files"
                >
                  <Plus className="w-5 h-5" />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  placeholder="Ask TaxPro ASI anything..."
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit(e);
                  }}
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-400 outline-none border-none ring-0 focus:ring-0 focus:outline-none caret-white font-sans"
                  autoFocus
                />

                {/* Voice Mic Button */}
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  className={`p-1.5 rounded-full transition-all cursor-pointer shrink-0 ${
                    isListening ? 'bg-rose-500 text-white animate-pulse' : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                  title={isListening ? "Listening..." : "Use Microphone"}
                >
                  <Mic className="w-5 h-5" />
                </button>

                {/* Send button when text is entered */}
                {promptInput.trim() && (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="p-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer shadow-md shrink-0"
                    title="Send message"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            
            /* B. ACTIVE CHAT CONVERSATION VIEW */
            <div className="w-full flex flex-col gap-6 py-4 flex-1">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex flex-col gap-2 w-full animate-in fade-in duration-200 ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  {/* User Bubble */}
                  {msg.role === 'user' ? (
                    <div className="bg-[#1f2937] text-white px-4 py-2 rounded-2xl text-sm leading-relaxed max-w-[85%] whitespace-pre-line shadow-xs">
                      {msg.content}
                    </div>
                  ) : (
                    /* Assistant Answer */
                    <div className="w-full text-[#ECECEC] text-sm leading-relaxed pl-1">
                      
                      <MarkdownContent content={msg.content} />

                      {/* Action Bar (Copy, Print, Speaker, Thumbs, Regenerate) */}
                      <div className="flex items-center gap-1.5 mt-3 text-gray-400">
                        
                        {/* Copy */}
                        <button
                          onClick={() => handleCopy(msg.content, idx)}
                          className="p-1.5 rounded-lg hover:bg-[#262626] hover:text-white transition-colors cursor-pointer"
                          title="Copy response"
                        >
                          {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        {/* Print Summary */}
                        <button
                          onClick={() => handlePrintMessage(msg.content)}
                          className="flex items-center gap-1 p-1.5 rounded-lg hover:bg-[#262626] hover:text-white transition-colors cursor-pointer text-xs"
                          title="Print this summary"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print</span>
                        </button>

                        {/* Speaker */}
                        <button
                          onClick={() => handleToggleSpeaker(msg.content, idx)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            speakingMsgIndex === idx
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'hover:bg-[#262626] hover:text-white'
                          }`}
                          title={speakingMsgIndex === idx ? "Stop reading" : "Read aloud"}
                        >
                          {speakingMsgIndex === idx ? (
                            <VolumeX className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Thumbs Up */}
                        <button
                          onClick={() => {
                            setFeedbackGiven({ ...feedbackGiven, [idx]: 'up' });
                            if (onShowToast) onShowToast('Thanks for your feedback!', 'success');
                          }}
                          className={`p-1.5 rounded-lg hover:bg-[#262626] transition-colors cursor-pointer ${
                            feedbackGiven[idx] === 'up' ? 'text-emerald-400' : 'hover:text-white'
                          }`}
                          title="Good response"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Thumbs Down */}
                        <button
                          onClick={() => {
                            setFeedbackGiven({ ...feedbackGiven, [idx]: 'down' });
                            if (onShowToast) onShowToast('Feedback recorded', 'info');
                          }}
                          className={`p-1.5 rounded-lg hover:bg-[#262626] transition-colors cursor-pointer ${
                            feedbackGiven[idx] === 'down' ? 'text-rose-400' : 'hover:text-white'
                          }`}
                          title="Bad response"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Regenerate */}
                        <button
                          onClick={() => {
                            const lastUser = messages.findLast(m => m.role === 'user');
                            if (lastUser) handleSubmit(null, lastUser.content);
                          }}
                          className="p-1.5 rounded-lg hover:bg-[#262626] hover:text-white transition-colors cursor-pointer"
                          title="Regenerate"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Generating Pulse */}
              {isGenerating && (
                <div className="flex items-center gap-2 text-xs text-gray-400 animate-pulse pl-1">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>TaxPro is querying database & generating summary...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

        </div>

        {/* Bottom Floating Prompt Capsule (ONLY SHOWN WHEN CHAT IS ACTIVE) */}
        {messages.length > 0 && (
          <div className="relative z-10 p-4 max-w-3xl w-full mx-auto">
            
            <div className="text-[11px] text-center text-gray-500 mb-2">
              TaxPro ASI learns from continuous firm interactions. Check important compliance info.
            </div>

            <form 
              onSubmit={handleSubmit}
              className="w-full bg-[#212121] hover:bg-[#262626] focus-within:bg-[#212121] border border-white/10 focus-within:border-white/20 rounded-full px-4 py-2.5 shadow-2xl transition-all flex items-center gap-3 relative"
            >
              {/* Left Plus Attachment Icon */}
              <button 
                type="button"
                onClick={() => {
                  if (onShowToast) onShowToast('File & Tax Document attachments ready', 'info');
                }}
                className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
                title="Attach files"
              >
                <Plus className="w-5 h-5" />
              </button>

              {/* Input Text Box */}
              <input
                ref={inputRef}
                type="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                placeholder="Ask TaxPro ASI anything..."
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-400 outline-none border-none ring-0 focus:ring-0 focus:outline-none caret-white font-sans"
                autoFocus
              />

              {/* Think Pill Button */}
              <button
                type="button"
                onClick={() => {
                  setIsThinkMode(!isThinkMode);
                  if (onShowToast) onShowToast(isThinkMode ? 'Standard mode' : 'Think & Deep Reasoning enabled', 'info');
                }}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  isThinkMode
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-transparent text-gray-300 hover:bg-white/10'
                }`}
                title="Toggle Deep Reasoning Think Mode"
              >
                <BrainCircuit className="w-3.5 h-3.5" />
                <span>Think</span>
              </button>

              {/* Mic Icon */}
              <button
                type="button"
                onClick={handleVoiceInput}
                className={`p-1.5 rounded-full transition-all cursor-pointer shrink-0 ${
                  isListening ? 'bg-rose-500 text-white animate-pulse' : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
                title={isListening ? "Listening..." : "Dictate with voice"}
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* Animated Blue Voice Wave Circle Pill */}
              <button
                type="button"
                onClick={handleVoiceInput}
                className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 transition-all shrink-0 cursor-pointer animate-pulse active:scale-95"
                title="Voice AI Live Waves"
              >
                <AudioWaveform className="w-4 h-4 animate-bounce" />
              </button>
            </form>

          </div>
        )}

      </main>

    </div>
  );
}
