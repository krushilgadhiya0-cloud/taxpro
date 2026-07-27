import React, { useState, useRef, useEffect } from 'react';
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

export default function AIAssistant({ isOpen, onClose, onShowToast }) {
  const [inputMsg, setInputMsg] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

  const handleVoiceCommandToggle = () => {
    setIsVoiceActive(!isVoiceActive);
    if (!isVoiceActive) {
      if (onShowToast) onShowToast('Listening for Level 7 Voice Commands...', 'info');
      // Mock finishing recording after 3 seconds
      setTimeout(() => {
        setIsVoiceActive(false);
        const voiceText = "Generate report and pay Rahul ₹50,000";
        setMessages((prev) => [...prev, { sender: 'user', text: `🎤 "${voiceText}"`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        
        setTimeout(() => {
          setMessages((prev) => [...prev, { 
            sender: 'ai', 
            text: `Executing Voice Directives.\n✓ Generated August Compliance Report\n✓ Dispatched ₹50,000 to Rahul's primary account.`, 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          }]);
        }, 1500);
      }, 3000);
    }
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
