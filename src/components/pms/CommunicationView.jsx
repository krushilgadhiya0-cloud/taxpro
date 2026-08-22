import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, Users, Circle, MoreVertical, Search, Paperclip, Smile, RefreshCw } from 'lucide-react';

export default function CommunicationView({ onShowToast }) {
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  const currentUserEmail = (localStorage.getItem('taxpro_user_email') || 'admin@taxpro.com').toLowerCase().trim();
  const currentUserName = localStorage.getItem('taxpro_user_name') || 'Administrator';
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

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
    scrollToBottom();
  }, [messages]);

  // 3. Send Broadcast Message (Persists in PostgreSQL SQL)
  const handleSend = async (e) => {
    e.preventDefault();
    const text = inputMsg.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputMsg('');

    const optimisticMsg = {
      id: `OPT-${Date.now()}`,
      text: text,
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
          content: text,
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f3f4f6] min-h-screen text-gray-800 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold font-outfit text-[#1e1e2d] flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-indigo-600" />
            Global Firm Broadcast & Notices
          </h1>
          <p className="text-xs text-gray-500 mt-1">Cross-department communication channel for all verified personnel. Synced live to SQL.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchBroadcast()}
            title="Sync Latest Announcements"
            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-indigo-600 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:bg-gray-50 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            Sync Now
          </button>
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
            <Circle className="w-2 h-2 text-emerald-500 fill-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-emerald-700">Multi-Device Live Sync</span>
          </div>
        </div>
      </div>

      {/* Main Chat Box Container */}
      <div className="flex-1 bg-white border border-gray-200 rounded-3xl shadow-xs overflow-hidden flex flex-col h-[70vh]">
        
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center border border-indigo-200 shadow-2xs">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900"># general-hq</h2>
              <p className="text-[11px] text-gray-500 font-semibold">Firm-wide notices, compliance alerts, and practice updates.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
              {messages.length} Announcements
            </span>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-gray-50/20">
          {isLoading && messages.length === 0 ? (
            <div className="text-center w-full my-auto text-gray-400 text-xs font-semibold flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
              Loading notices from PostgreSQL database...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center w-full my-auto text-gray-400 text-xs font-semibold max-w-sm mx-auto p-6 bg-white border border-gray-100 rounded-2xl shadow-xs">
              <MessageSquare className="w-8 h-8 text-indigo-300 mx-auto mb-2" />
              No announcements posted in #general-hq yet.
              <p className="text-[11px] text-gray-400 mt-1">Post a message below to broadcast to all team members across all devices.</p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex max-w-[85%] ${m.isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                {!m.isMe && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex-shrink-0 flex items-center justify-center font-extrabold text-[10px] shadow-xs mr-3 mt-1">
                    {m.senderId || (m.senderName ? m.senderName.substring(0, 2).toUpperCase() : 'TM')}
                  </div>
                )}

                <div className={`flex flex-col ${m.isMe ? 'items-end' : 'items-start'}`}>
                  {!m.isMe && <span className="text-[10px] font-bold text-gray-600 mb-1 ml-1">{m.senderName}</span>}
                  <div className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm shadow-xs ${
                    m.isMe 
                      ? 'bg-[#5b52e0] text-white rounded-tr-xs' 
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-xs'
                  }`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  </div>
                  <span className="text-[9px] font-semibold text-gray-400 mt-1 mx-1.5">{m.time}</span>
                </div>
              </div>
            ))
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer Area */}
        <div className="p-4 bg-white border-t border-gray-100">
          <form onSubmit={handleSend} className="flex items-center gap-3">
            <button type="button" className="p-2.5 text-gray-400 hover:text-indigo-500 transition-colors bg-gray-50 rounded-full cursor-pointer">
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
              disabled={!inputMsg.trim() || isSending}
              className={`p-3 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer ${
                inputMsg.trim() && !isSending ? 'bg-[#5b52e0] text-white hover:scale-105' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Send className={`w-4 h-4 ${inputMsg.trim() ? 'ml-0.5' : ''}`} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
