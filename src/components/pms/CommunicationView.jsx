import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Users, Circle, MoreVertical, Search, Paperclip, Smile } from 'lucide-react';

export default function CommunicationView({ onShowToast }) {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hey team, did we get the Acme Corp data?", senderId: 'KG', senderName: 'Krushil Gadhiya', time: '10:00 AM', isMe: true },
    { id: 2, text: "Yes, I just uploaded it to their portal. They also requested an extension for ITR.", senderId: 'PS', senderName: 'Priya Sharma', time: '10:05 AM', isMe: false },
    { id: 3, text: "Great. Alex, please review the ITR draft.", senderId: 'KG', senderName: 'Krushil Gadhiya', time: '10:12 AM', isMe: true },
    { id: 4, text: "Will do. Expect it by EOD today.", senderId: 'AS', senderName: 'Alex Sterling', time: '10:15 AM', isMe: false },
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        text: inputMsg,
        senderId: 'KG',
        senderName: 'Krushil Gadhiya',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: true
      }
    ]);
    setInputMsg('');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f3f4f6] min-h-screen text-gray-800 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold font-outfit text-[#1e1e2d]">Global Team Chat</h1>
          <p className="text-xs text-gray-500 mt-1">Cross-department communication channel for all active personnel.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100">
          <Circle className="w-2.5 h-2.5 text-emerald-500 fill-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-emerald-700">12 Members Online</span>
        </div>
      </div>

      {/* Main Chat Box Container */}
      <div className="flex-1 bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden flex flex-col h-[70vh]">
        
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900"># general-hq</h2>
              <p className="text-[10px] text-gray-500 font-semibold">Any firm-wide announcements or queries.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-gray-400">
            <Search className="w-4 h-4 cursor-pointer hover:text-gray-600" />
            <MoreVertical className="w-4 h-4 cursor-pointer hover:text-gray-600" />
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-gray-50/30">
          
          <div className="text-center">
            <span className="bg-gray-100 text-gray-400 text-[10px] font-bold px-3 py-1 rounded-full">TODAY</span>
          </div>

          {messages.map((m) => (
            <div key={m.id} className={`flex max-w-[80%] ${m.isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
              
              {!m.isMe && (
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex-shrink-0 flex items-center justify-center font-bold text-[10px] shadow-sm mr-3 mt-1">
                  {m.senderId}
                </div>
              )}

              <div className={`flex flex-col ${m.isMe ? 'items-end' : 'items-start'}`}>
                {!m.isMe && <span className="text-[10px] font-bold text-gray-500 mb-1 ml-1">{m.senderName}</span>}
                <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                  m.isMe ? 'bg-[#5b52e0] text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                }`}>
                  {m.text}
                </div>
                <span className="text-[9px] font-semibold text-gray-400 mt-1 mx-1.5">{m.time}</span>
              </div>
            </div>
          ))}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer Area */}
        <div className="p-4 bg-white border-t border-gray-100">
          <form onSubmit={handleSend} className="flex items-center gap-3">
            <button type="button" className="p-2 text-gray-400 hover:text-indigo-500 transition-colors bg-gray-50 rounded-full">
              <Paperclip className="w-4 h-4" />
            </button>
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="Type a message to the team..."
                value={inputMsg}
                onChange={e => setInputMsg(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-sm px-4 py-3 rounded-full outline-none focus:border-indigo-500 focus:bg-white transition-all pr-10"
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-yellow-500 transition-colors">
                <Smile className="w-4 h-4" />
              </button>
            </div>
            <button 
              type="submit" 
              className={`p-3 rounded-full flex items-center justify-center shadow-md transition-all ${
                inputMsg.trim() ? 'bg-[#5b52e0] text-white hover:scale-105' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
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
