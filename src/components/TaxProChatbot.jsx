import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Sparkles, 
  X, 
  Minus, 
  Send, 
  RotateCcw, 
  Copy, 
  Check, 
  Trash2, 
  ShieldCheck, 
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Calculator,
  FileText,
  Building2,
  Receipt,
  UserCheck,
  Maximize2,
  Minimize2,
  ArrowDown
} from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  { icon: Building2, text: 'Show practice overview & statistics', category: 'Firm Data' },
  { icon: ShieldCheck, text: 'Is our firm data secure & isolated?', category: 'Security' },
  { icon: FileText, text: 'What tasks are pending?', category: 'Tasks' },
  { icon: Receipt, text: 'Show total practice revenue & pending fees', category: 'Finance' },
  { icon: UserCheck, text: 'Who is present today?', category: 'Staff' },
  { icon: Calculator, text: 'Explain GST vs TDS rates', category: 'Tax Law' },
  { icon: HelpCircle, text: 'How can TaxPro help me?', category: 'Platform' }
];

// Helper: Code Block with Copy Button
function ChatCodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  return (
    <div className="my-2.5 rounded-xl overflow-hidden border border-white/10 bg-[#090d16] text-xs font-mono shadow-md">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10 text-[10px] text-gray-400">
        <span className="uppercase tracking-wider font-bold text-cyan-400">{lang || 'CODE'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3 text-emerald-300 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Helper: Markdown Table Component
function ChatTable({ lines }) {
  if (!lines || lines.length < 2) return null;
  const cleanCells = (line) =>
    line.split('|').map((c) => c.trim()).filter((c, idx, arr) => !(idx === 0 && c === '') && !(idx === arr.length - 1 && c === ''));
  const header = cleanCells(lines[0]);
  const bodyRows = lines.slice(1).filter((l) => !l.includes('---')).map(cleanCells);

  return (
    <div className="my-2.5 overflow-x-auto rounded-xl border border-white/10 shadow-xs">
      <table className="min-w-full text-xs text-left">
        <thead className="bg-white/10 text-white font-semibold uppercase tracking-wider">
          <tr>
            {header.map((h, idx) => (
              <th key={idx} className="px-3 py-1.5 border-b border-white/10">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 bg-black/25">
          {bodyRows.map((r, rIdx) => (
            <tr key={rIdx} className="hover:bg-white/5 transition-colors">
              {r.map((cell, cIdx) => (
                <td key={cIdx} className="px-3 py-1.5 text-gray-300">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Markdown Formatter for Chat Messages
function ChatMarkdown({ content }) {
  if (!content) return null;

  const blocks = [];
  const rawLines = content.split('\n');
  let currentCode = null;
  let currentTable = null;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (currentCode) {
        blocks.push({ type: 'code', code: currentCode.lines.join('\n'), lang: currentCode.lang });
        currentCode = null;
      } else {
        if (currentTable) {
          blocks.push({ type: 'table', lines: currentTable });
          currentTable = null;
        }
        const lang = trimmed.replace(/^```/, '').trim();
        currentCode = { lang, lines: [] };
      }
      continue;
    }

    if (currentCode) {
      currentCode.lines.push(line);
      continue;
    }

    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
      if (!currentTable) currentTable = [];
      currentTable.push(trimmed);
      continue;
    } else if (currentTable) {
      blocks.push({ type: 'table', lines: currentTable });
      currentTable = null;
    }

    blocks.push({ type: 'line', text: line });
  }

  if (currentCode) {
    blocks.push({ type: 'code', code: currentCode.lines.join('\n'), lang: currentCode.lang });
  }
  if (currentTable) {
    blocks.push({ type: 'table', lines: currentTable });
  }

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
        tokens.push({ type: 'bold', value: raw.slice(2, -2) });
      } else if (raw.startsWith('`') && raw.endsWith('`')) {
        tokens.push({ type: 'code', value: raw.slice(1, -1) });
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
            className="text-cyan-400 hover:text-cyan-300 underline font-semibold inline-flex items-center gap-0.5 cursor-pointer bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20"
          >
            <span>{token.label}</span>
          </a>
        );
      }
      if (token.type === 'bold') {
        return <strong key={`bold-${tIdx}`} className="font-bold text-white">{token.value}</strong>;
      }
      if (token.type === 'code') {
        return (
          <span key={`code-${tIdx}`} className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-white/10 text-cyan-300">
            {token.value}
          </span>
        );
      }
      return <span key={`text-${tIdx}`}>{token.value.replace(/\*\*/g, '')}</span>;
    });
  };

  return (
    <div className="space-y-1.5 text-xs sm:text-sm text-gray-200 leading-relaxed">
      {blocks.map((block, bIdx) => {
        if (block.type === 'code') {
          return <ChatCodeBlock key={`code-${bIdx}`} code={block.code} lang={block.lang} />;
        }
        if (block.type === 'table') {
          return <ChatTable key={`table-${bIdx}`} lines={block.lines} />;
        }

        const trimmed = (block.text || '').trim();
        if (!trimmed) return <div key={`sp-${bIdx}`} className="h-1" />;

        if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
          return <div key={`hr-${bIdx}`} className="h-px bg-white/10 my-2" />;
        }

        if (trimmed.startsWith('> ')) {
          return (
            <div key={`q-${bIdx}`} className="border-l-2 border-cyan-400 pl-2.5 py-1 bg-cyan-500/5 text-gray-300 italic rounded-r-md">
              {formatInline(trimmed.replace(/^>\s*/, ''))}
            </div>
          );
        }

        if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          const cleanHeading = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
          return (
            <h4 key={`h-${bIdx}`} className="text-xs sm:text-sm font-bold text-white mt-2 mb-0.5 tracking-tight">
              {cleanHeading}
            </h4>
          );
        }

        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numberedMatch) {
          return (
            <div key={`n-${bIdx}`} className="flex items-start gap-1.5 pl-1 py-0.5">
              <span className="font-semibold text-cyan-400 text-xs shrink-0">{numberedMatch[1]}.</span>
              <div className="flex-1">{formatInline(numberedMatch[2])}</div>
            </div>
          );
        }

        if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const bulletText = trimmed.replace(/^[•\-*]\s+/, '');
          return (
            <div key={`b-${bIdx}`} className="flex items-start gap-1.5 pl-1.5 py-0.5">
              <span className="text-cyan-400 text-xs shrink-0">•</span>
              <div className="flex-1">{formatInline(bulletText)}</div>
            </div>
          );
        }

        return <p key={`p-${bIdx}`} className="m-0 leading-relaxed">{formatInline(block.text)}</p>;
      })}
    </div>
  );
}

export default function TaxProChatbot({ onShowToast }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('taxpro_chatbot_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Streaming/Typing Animation State
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const [streamedText, setStreamedText] = useState('');
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Save conversation history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('taxpro_chatbot_history', JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

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

  // Detect user scroll position
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const scrolledUp = scrollHeight - scrollTop - clientHeight > 90;
    setIsUserScrolledUp(scrolledUp);
  };

  // Auto-scroll on new message or stream update IF not scrolled up reading earlier messages
  useEffect(() => {
    if (isOpen && !isMinimized && !isUserScrolledUp) {
      scrollToBottom('smooth');
    }
  }, [messages, streamedText, isLoading, isOpen, isMinimized, isUserScrolledUp]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => {
        inputRef.current?.focus();
        scrollToBottom('auto');
      }, 150);
    }
  }, [isOpen, isMinimized]);

  // Send message handler
  const handleSendMessage = async (textToSend = null) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: userTimestamp
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputMessage('');
    setIsLoading(true);
    setShowClearConfirm(false);
    setIsUserScrolledUp(false);
    setTimeout(() => scrollToBottom('smooth'), 50);

    try {
      // Send message and last 8 conversational turns
      const historyPayload = newHistory.slice(-8).map((m) => ({
        role: m.role,
        content: m.content
      }));

      const firmName = localStorage.getItem('taxpro_firm_name') || 'TaxPro Advisory & Tax Associates';
      const firmTag = localStorage.getItem('taxpro_firm_tag') || 'TaxPro';
      const activeModule = localStorage.getItem('taxpro_active_module') || 'Dashboard';
      const userEmail = localStorage.getItem('taxpro_user_email') || 'admin@taxpro.com';

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          conversationHistory: historyPayload,
          screenContext: { 
            source: 'TaxProChatbotWidget',
            firmName,
            firmTag,
            activeItem: activeModule
          },
          firmName,
          firmTag,
          userEmail
        })
      });

      const data = await res.json();
      const aiResponseText = data.textResponse || data.voiceResponse || "Sorry, I'm having trouble connecting right now. Please try again in a moment.";

      const aiMsgId = `ai-${Date.now()}`;
      const aiTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setStreamingMessageId(null);
      setStreamedText('');
      setMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          role: 'assistant',
          content: aiResponseText,
          timestamp: aiTimestamp
        }
      ]);
      setIsLoading(false);

    } catch (err) {
      const fallbackText = "Sorry, I'm having trouble connecting right now. Please try again in a moment.";
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setIsLoading(false);
    }
  };

  // Regenerate last response
  const handleRegenerate = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) {
      handleSendMessage(lastUser.content);
    }
  };

  // Copy message text
  const handleCopy = (content, id) => {
    try {
      navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      if (onShowToast) onShowToast('Response copied to clipboard', 'info');
    } catch (e) {}
  };

  // Clear conversation history
  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem('taxpro_chatbot_history');
    setShowClearConfirm(false);
    if (onShowToast) onShowToast('Chat conversation cleared', 'info');
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. FLOATING LAUNCHER BUTTON (Bottom-Right, Non-Intrusive)                  */}
      {/* ========================================================================= */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 animate-in fade-in zoom-in-90 duration-300">
          <button
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white font-semibold text-xs sm:text-sm shadow-2xl hover:shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
            aria-label="Open TaxPro AI Chatbot"
          >
            {/* Glowing Pulse Ring */}
            <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 opacity-30 group-hover:opacity-60 blur-xs transition-opacity animate-pulse" />

            <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-white/20 backdrop-blur-xs">
              <Bot className="w-4 h-4 text-white" />
            </div>

            <span className="relative tracking-wide font-outfit">TaxPro AI</span>

            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CHAT WINDOW (Desktop Floating Card & Mobile Bottom Drawer)              */}
      {/* ========================================================================= */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ease-out flex flex-col overflow-hidden bg-[#0e1219]/95 backdrop-blur-2xl border border-white/15 shadow-2xl ${
            isMinimized
              ? 'bottom-5 right-5 w-72 h-14 rounded-2xl'
              : 'inset-x-0 bottom-0 h-[88vh] rounded-t-3xl sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[410px] sm:h-[580px] sm:max-h-[85vh] sm:rounded-3xl'
          }`}
        >
          {/* ======================================================================= */}
          {/* HEADER BAR                                                              */}
          {/* ======================================================================= */}
          <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10 shrink-0 select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-[1px] shadow-sm">
                <div className="w-full h-full bg-[#0e1219] rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0e1219]" />
              </div>

              <div className="flex flex-col truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-white font-outfit tracking-wide truncate">
                    TaxPro AI
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
                    Ready
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 font-medium">Online • Practice Copilot</span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-gray-400">
              {/* Clear conversation toggle */}
              {!isMinimized && messages.length > 0 && (
                <button
                  onClick={() => setShowClearConfirm(!showClearConfirm)}
                  className="p-1.5 rounded-lg hover:bg-white/10 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Clear conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {/* Minimize */}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minus className="w-4 h-4" />}
              </button>

              {/* Close */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-rose-500/20 hover:text-rose-400 transition-colors cursor-pointer"
                title="Close chatbot"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CLEAR CONFIRMATION OVERLAY */}
          {showClearConfirm && (
            <div className="px-4 py-2.5 bg-rose-950/80 border-b border-rose-500/30 flex items-center justify-between text-xs text-rose-200 animate-in fade-in duration-150 shrink-0">
              <span>Clear conversation history?</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearChat}
                  className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* BODY (MESSAGES / WELCOME SCREEN)                                        */}
          {/* ======================================================================= */}
          {!isMinimized && (
            <div 
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 space-y-4 chat-custom-scrollbar overscroll-contain relative"
            >
              {/* Floating Jump to Latest Button (when user scrolls up to read earlier history) */}
              {isUserScrolledUp && (
                <div className="sticky top-2 z-20 flex justify-center w-full pointer-events-none">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserScrolledUp(false);
                      scrollToBottom('smooth');
                    }}
                    className="pointer-events-auto px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-[11px] font-bold shadow-xl backdrop-blur-md flex items-center gap-1.5 transition-all animate-bounce cursor-pointer border border-cyan-400/40"
                    title="Scroll down to newest question and answer"
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-cyan-200" />
                    <span>Jump to latest</span>
                  </button>
                </div>
              )}

              {/* A. WELCOME SCREEN (When chat is empty) */}
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center py-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-[1.5px] shadow-lg">
                    <div className="w-full h-full bg-[#0e1219] rounded-2xl flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-bold text-white font-outfit">
                      Hi! I'm TaxPro AI 👋
                    </h3>
                    <p className="text-xs text-gray-400 max-w-[280px]">
                      How can I help you today? Ask any tax, GST, or practice question below:
                    </p>
                  </div>

                  {/* SUGGESTED QUESTIONS GRID */}
                  <div className="w-full grid grid-cols-1 gap-1.5 text-left pt-2">
                    {SUGGESTED_QUESTIONS.map((item, idx) => {
                      const IconComp = item.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(item.text)}
                          className="group flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-cyan-500/40 text-left transition-all cursor-pointer shadow-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                              <IconComp className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs text-gray-200 group-hover:text-white font-medium truncate">
                              {item.text}
                            </span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-cyan-400 shrink-0 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* B. CONVERSATION MESSAGES */}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-1 w-full animate-in fade-in duration-200 ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  {/* User Bubble */}
                  {msg.role === 'user' ? (
                    <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3.5 py-2 text-xs sm:text-sm leading-relaxed shadow-md whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  ) : (
                    /* AI Assistant Bubble */
                    <div className="w-full max-w-[95%] rounded-2xl rounded-tl-xs bg-white/5 border border-white/10 px-3.5 py-3 text-xs sm:text-sm text-gray-100 shadow-md">
                      <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">
                        <Bot className="w-3 h-3" />
                        <span>TaxPro Assistant</span>
                      </div>

                      <ChatMarkdown content={msg.content} />

                      {/* Action Bar (Copy & Regenerate) */}
                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/5 text-[10px] text-gray-400">
                        <span className="text-[10px] text-gray-500">{msg.timestamp}</span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopy(msg.content, msg.id)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                          </button>

                          <button
                            onClick={handleRegenerate}
                            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                            title="Regenerate answer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Regenerate</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {msg.role === 'user' && (
                    <span className="text-[9px] text-gray-500 pr-1">{msg.timestamp}</span>
                  )}
                </div>
              ))}

              {/* Streaming Output Simulation */}
              {streamingMessageId && (
                <div className="w-full max-w-[95%] rounded-2xl rounded-tl-xs bg-white/5 border border-white/10 px-3.5 py-3 text-xs sm:text-sm text-gray-100 shadow-md animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">
                    <Bot className="w-3 h-3 animate-spin" />
                    <span>TaxPro Assistant</span>
                  </div>
                  <ChatMarkdown content={streamedText} />
                  <span className="inline-block w-1.5 h-3.5 bg-cyan-400 ml-1 animate-pulse" />
                </div>
              )}

              {/* Loading Typing Indicator */}
              {isLoading && !streamingMessageId && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-gray-400 animate-pulse w-fit">
                  <Bot className="w-4 h-4 text-cyan-400 animate-bounce" />
                  <span>TaxPro AI is thinking...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* ======================================================================= */}
          {/* INPUT BAR                                                               */}
          {/* ======================================================================= */}
          {!isMinimized && (
            <div className="p-3 bg-white/5 border-t border-white/10 shrink-0 space-y-1.5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="relative flex items-center bg-[#090d16] border border-white/15 focus-within:border-cyan-500/50 rounded-2xl p-1.5 shadow-inner transition-colors"
              >
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  maxLength={2000}
                  rows={1}
                  placeholder="Ask a tax question or type a message..."
                  className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-gray-500 outline-none resize-none px-2.5 py-1.5 max-h-24 chat-custom-scrollbar font-sans"
                />

                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className={`p-2 rounded-xl text-white transition-all cursor-pointer shrink-0 ${
                    inputMessage.trim() && !isLoading
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:scale-105 shadow-md'
                      : 'bg-white/10 text-gray-500 opacity-50 cursor-not-allowed'
                  }`}
                  title="Send message (Enter)"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="flex items-center justify-between px-1 text-[10px] text-gray-500">
                <span className="truncate">TaxPro AI • Educational Guidance</span>
                <span>{inputMessage.length}/2000</span>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
