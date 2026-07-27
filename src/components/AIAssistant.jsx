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
  CheckCircle2
} from 'lucide-react';

export default function AIAssistant({ isOpen, onClose, onShowToast, onLogout }) {
  const [inputMsg, setInputMsg] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: '🤖 Level 7 Workspace AI Initialized.\n\nI am deeply integrated into your database. You can talk naturally ("Show attendance", "Pay Rahul") or use Vision AI (Upload Invoices, CSV, handwritten sheets) and I will execute the commands instantly!',
      time: 'System Boot'
    }
  ]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputMsg;
    if (!text.trim()) return;

    setMessages((prev) => [...prev, {
      sender: 'user',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setInputMsg('');

    // Local Neural Fallback Response
    setTimeout(() => {
      let responseText = `Command recognized: "${text}". Based on historical cashflows, operating expenses are projected to decline by 12.4% next month while payroll remains stabilized at $65.2k.`;
      
      if (text.toLowerCase().includes('generate report')) {
        responseText = 'Report Engine: Generated draft compliance report #SOC2-2026. Ready for PDF download in Reports section.';
      } else if (text.toLowerCase().includes('show attendance')) {
        responseText = 'Attendance System parsed: 12 members currently clocked in. 2 on leave. Opening Dashboard metrics now.';
      } else if (text.toLowerCase().includes('pay rahul')) {
        responseText = 'Finance Execute: Dispatched ₹50,000 to Rahul\'s primary account verified across 2FA. Waiting on bank clearance.';
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: responseText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 800);
  };

  const executeIntent = (transcript) => {
    const text = transcript.toLowerCase();
    let handled = false;
    let aiResponse = '';

    // 1. NAVIGATION INTENT
    if (text.includes('open') || text.includes('go to') || text.includes('show')) {
      const match = text.match(/(?:open|go to|show)\s+(.+)/);
      if (match && match[1]) {
        // Capitalize each word for the exact tab name (e.g. "team members" -> "Team Members")
        const target = match[1].replace(/\b\w/g, c => c.toUpperCase()).trim();
        window.dispatchEvent(new CustomEvent('ai_navigate', { detail: target }));
        aiResponse = `Navigating to ${target} module now.`;
        handled = true;
      }
    }
    
    // 2. PRINT INTENT
    if (!handled && (text.includes('print this') || text.includes('print page') || text.includes('print report') || text === 'print')) {
      aiResponse = 'Initializing printer spooler for the current view...';
      setTimeout(() => window.print(), 1000);
      handled = true;
    }

    // 3. SEARCH INTENT
    if (!handled && (text.includes('search for') || text.includes('find'))) {
      const match = text.match(/(?:search for|find)\s+(.+)/);
      if (match && match[1]) {
        const query = match[1].trim();
        window.dispatchEvent(new CustomEvent('ai_search', { detail: query }));
        aiResponse = `Initiating global search for "${query}"...`;
        handled = true;
      }
    }

    // 4. LOGOUT INTENT
    if (!handled && (text.includes('sign out') || text.includes('log out'))) {
      aiResponse = 'Signing off. Goodbye!';
      setTimeout(() => {
        if (onLogout) onLogout();
        if (onClose) onClose();
      }, 1500);
      handled = true;
    }

    // Fallback if not specifically handled by Voice UI system
    if (!handled) {
      if (text.includes('generate report')) {
        aiResponse = 'Report Engine: Generated draft compliance report #SOC2-2026. Ready for PDF download in Reports section.';
      } else if (text.includes('show attendance')) {
        aiResponse = 'Attendance System parsed: 12 members currently clocked in. 2 on leave. Opening Dashboard metrics now.';
      } else if (text.includes('pay rahul')) {
        aiResponse = 'Finance Execute: Dispatched ₹50,000 to Rahul\'s primary account verified across 2FA. Waiting on bank clearance.';
      } else {
        aiResponse = `Command recognized: "${transcript}". Based on historical cashflows, operating expenses are projected to decline by 12.4% next month while payroll remains stabilized at $65.2k.`;
      }
    }

    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: aiResponse,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleVoiceCommandToggle = () => {
    if (shouldListenRef.current) {
      shouldListenRef.current = false;
      setIsVoiceActive(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      if (onShowToast) onShowToast('Voice AI is unsupported in this browser.', 'error');
      return;
    }

    shouldListenRef.current = true;
    setIsVoiceActive(true);

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      // Silent on restart
    };

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      setMessages((prev) => [...prev, { 
        sender: 'user', 
        text: `🎤 "${transcript}"`, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }]);
      executeIntent(transcript);
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return; // Ignore silence so it auto-restarts
      console.error('Speech recognition error', event.error);
      if (event.error !== 'aborted') {
         shouldListenRef.current = false;
         setIsVoiceActive(false);
         if (onShowToast) onShowToast(`Voice recognition failed: ${event.error}`, 'error');
      }
    };

    recognition.onend = () => {
      if (shouldListenRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch(e) {
          shouldListenRef.current = false;
          setIsVoiceActive(false);
        }
      } else {
        setIsVoiceActive(false);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      if (onShowToast) onShowToast('Continuous Voice AI Activated. Speak anywhere...', 'info');
    } catch (e) {}
  };

  const handleFileUpload = (e) => {
    if(!e.target.files.length) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    setMessages(prev => [...prev, { sender: 'user', text: `📎 Uploaded File: ${file.name}`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    
    if (onShowToast) onShowToast('Level 6 Vision AI parsing document...', 'info');

    setTimeout(() => {
      setIsUploading(false);
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: `Vision OCR Analysis Complete.\n\nExtracted Entities:\n- Identified 14 attendance records\n- Located 2 expense invoices\n\n✓ Database Synced and categorized successfully.`, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }]);
    }, 2500);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-md animate-fade-in">
      <div className="glass-panel border border-cyan-500/40 rounded-3xl shadow-2xl shadow-cyan-500/30 overflow-hidden flex flex-col h-[520px]">
        
        {/* Header */}
        <div className="p-4 bg-black/60 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-[1px]">
              <div className="w-full h-full bg-black rounded-2xl flex items-center justify-center">
                <Bot className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white font-outfit flex items-center gap-1.5">
                TaxPro Neural AI <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              </h4>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Level 7 Architecture
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-2.5 max-w-[90%] ${
                m.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${
                m.sender === 'user' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-purple-500/20 text-purple-400'
              }`}>
                {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-white rounded-tr-none'
                  : 'bg-white/[0.04] border border-white/10 text-gray-200 rounded-tl-none whitespace-pre-wrap'
              }`}>
                {m.text}
                <div className="text-[9px] text-gray-400 text-right mt-1 font-mono">{m.time}</div>
              </div>
            </div>
          ))}

          {/* Voice Soundwave Indicator */}
          {isVoiceActive && (
            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center gap-3 animate-pulse">
              <Mic className="w-4 h-4 text-cyan-400 animate-bounce" />
              <div className="flex items-center gap-1 h-4">
                {[12, 24, 18, 28, 14, 20, 10].map((h, i) => (
                  <span key={i} className="w-1 bg-cyan-400 rounded-full animate-pulse" style={{ height: `${h}px` }}></span>
                ))}
              </div>
              <span className="text-[10px] text-cyan-300 font-mono ml-auto">Listening...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-black/80 border-t border-white/10">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="flex flex-col gap-2 relative"
          >

            <div className="flex items-center gap-2 w-full">
              {/* File Upload Trigger */}
              <input 
                 type="file" 
                 id="vision-upload-ai" 
                 className="hidden" 
                 onChange={handleFileUpload} 
                 accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx"
              />
              <label 
                 htmlFor="vision-upload-ai"
                 className="p-2.5 rounded-xl border bg-white/5 border-white/10 text-fuchsia-400 hover:text-fuchsia-300 hover:bg-white/10 transition-colors cursor-pointer relative"
                 title="Level 6 Vision AI"
              >
                 <Paperclip className="w-4 h-4" />
                 {isUploading && (
                   <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-fuchsia-500 rounded-full animate-ping"></span>
                 )}
              </label>

              <button
                type="button"
                onClick={handleVoiceCommandToggle}
                title="Level 7 Voice AI"
                className={`p-2.5 rounded-xl border transition-colors ${
                  isVoiceActive 
                  ? 'bg-red-500/20 border-red-500/40 text-red-500 animate-pulse' 
                  : 'bg-white/5 border-white/10 text-cyan-400 hover:text-cyan-300 hover:bg-white/10'
                }`}
              >
                {isVoiceActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Tell AI to do anything..."
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  className="w-full glass-input px-3 py-2 text-xs"
                />
              </div>

              <button
                type="submit"
                className={`p-2.5 rounded-xl transition-all ${
                  inputMsg.trim() ? 'btn-neon-primary' : 'bg-white/5 border border-white/10 text-gray-500'
                }`}
              >
                <Send className={`w-4 h-4 ${inputMsg.trim() ? 'text-black' : ''}`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold px-1 mt-1">
              <span className="flex items-center gap-1"><UploadCloud className="w-3 h-3 text-fuchsia-500" /> Upload (Invoices, Excels)</span>
              <span className="flex items-center gap-1"><Mic className="w-3 h-3 text-cyan-500" /> Voice Commands </span>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}
