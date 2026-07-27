import React, { useState, useEffect, useRef } from 'react';
import { Send, Search, CheckCheck, Smile, Paperclip, MoreVertical, Phone, Video } from 'lucide-react';

export default function PrivateChatView({ onShowToast, preSelectedUser }) {
  const [activeContact, setActiveContact] = useState(null);
  const [inputMsg, setInputMsg] = useState('');
  const messagesEndRef = useRef(null);

  // Hardcoded contacts for UI demo
  // Real contacts using localStorage
  const [contacts, setContacts] = useState(() => {
    try {
      const saved = localStorage.getItem('taxpro_private_contacts');
      if (saved) return JSON.parse(saved) || [];
    } catch (e) {}
    return [];
  });

  // Chat history using localStorage
  const [chats, setChats] = useState(() => {
    try {
      const savedChats = localStorage.getItem('taxpro_private_chats');
      if (savedChats) return JSON.parse(savedChats) || {};
    } catch (e) {}
    return {};
  });

  React.useEffect(() => {
    localStorage.setItem('taxpro_private_contacts', JSON.stringify(contacts));
  }, [contacts]);

  React.useEffect(() => {
    localStorage.setItem('taxpro_private_chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    if (preSelectedUser) {
      // Find contact or add them
      let existing = contacts.find(c => c.name.toLowerCase() === preSelectedUser.name.toLowerCase());
      if (existing) {
        setActiveContact(existing);
      } else {
        const newContact = { 
          id: Date.now(), 
          name: preSelectedUser.name, 
          role: preSelectedUser.role || 'Member', 
          avatar: preSelectedUser.initials || preSelectedUser.name.substring(0, 2).toUpperCase(), 
          online: true 
        };
        setContacts([newContact, ...contacts]);
        setChats(prev => ({ ...prev, [newContact.id]: [] }));
        setActiveContact(newContact);
      }
    } else if (!activeContact && contacts.length > 0) {
      setActiveContact(contacts[0]);
    }
  }, [preSelectedUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const activeMessages = activeContact ? (chats[activeContact.id] || []) : [];

  useEffect(() => {
    scrollToBottom();
  }, [activeMessages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !activeContact) return;

    setChats(prev => ({
      ...prev,
      [activeContact.id]: [
        ...(prev[activeContact.id] || []),
        {
          id: Date.now(),
          text: inputMsg,
          isMe: true,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    }));
    setInputMsg('');
  };

  return (
    <div className="flex h-[calc(100vh-60px)] bg-[#f3f4f6]">
      
      {/* Sidebar - Contact List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm">
        <div className="p-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-xl font-extrabold text-gray-900 font-outfit mb-4">Direct Messages</h2>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search contacts..." 
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors focus:bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-1">
          {contacts.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveContact(c)}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all border ${
                activeContact?.id === c.id 
                  ? 'bg-indigo-50 border-indigo-200 shadow-xs' 
                  : 'bg-transparent border-transparent hover:bg-gray-50'
              }`}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                  {c.avatar}
                </div>
                {c.online && <div className="absolute right-0 bottom-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>}
              </div>
              
              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h4 className={`text-sm font-bold truncate ${activeContact?.id === c.id ? 'text-indigo-900' : 'text-gray-900'}`}>{c.name}</h4>
                  {(chats[c.id] && chats[c.id].length > 0) && (
                    <span className="text-[10px] text-gray-400 font-semibold">{chats[c.id][chats[c.id].length - 1].time}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-medium truncate">
                  {chats[c.id] && chats[c.id].length > 0 ? chats[c.id][chats[c.id].length - 1].text : 'Click to chat...'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      {activeContact ? (
        <div className="flex-1 flex flex-col bg-white">
          {/* Header */}
          <div className="h-16 border-b border-gray-100 flex flex-shrink-0 items-center justify-between px-6 bg-gray-50/30">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                  {activeContact.avatar}
                </div>
                {activeContact.online && <div className="absolute right-0 bottom-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>}
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 leading-tight text-base">{activeContact.name}</h3>
                <p className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider">{activeContact.online ? 'Online' : 'Offline'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-gray-400">
              <button className="p-2 hover:bg-gray-100 rounded-full hover:text-indigo-600 transition-colors"><Phone className="w-5 h-5" /></button>
              <button className="p-2 hover:bg-gray-100 rounded-full hover:text-indigo-600 transition-colors"><Video className="w-5 h-5" /></button>
              <button className="p-2 hover:bg-gray-100 rounded-full hover:text-indigo-600 transition-colors"><MoreVertical className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-gray-50/30 flex flex-col gap-4">
            {activeMessages.length === 0 && (
              <div className="text-center w-full mt-10 text-gray-400 text-sm font-semibold">
                This is the beginning of your chat history with {activeContact.name}.
              </div>
            )}
            {activeMessages.map(msg => (
              <div key={msg.id} className={`flex max-w-xl ${msg.isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm relative group ${
                  msg.isMe 
                    ? 'bg-[#5b52e0] text-white rounded-br-sm' 
                    : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  <p>{msg.text}</p>
                  <div className={`flex items-center gap-1 mt-1 justify-end ${msg.isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                    <span className="text-[9px] font-semibold">{msg.time}</span>
                    {msg.isMe && <CheckCheck className="w-3 h-3" />}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Section */}
          <div className="p-4 bg-white border-t border-gray-100">
            <form onSubmit={handleSend} className="flex items-center gap-3">
              <button type="button" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 transition-all rounded-full shrink-0">
                <Paperclip className="w-5 h-5" />
              </button>
              
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  value={inputMsg}
                  onChange={e => setInputMsg(e.target.value)}
                  placeholder={`Message ${activeContact.name}...`}
                  className="w-full bg-gray-50 border border-gray-200 rounded-full px-5 py-3 text-sm outline-none focus:border-indigo-500 transition-colors pr-12 focus:bg-white text-gray-800 font-medium"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-yellow-500 rounded-full transition-colors shrink-0">
                  <Smile className="w-4 h-4" />
                </button>
              </div>

              <button 
                type="submit" 
                disabled={!inputMsg.trim()}
                className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform ${
                  inputMsg.trim() ? 'bg-[#5b52e0] text-white shadow-lg hover:scale-105 hover:bg-[#4c44cf]' : 'bg-gray-100 text-gray-400'
                }`}
              >
                <Send className={`w-5 h-5 ${inputMsg.trim() ? 'ml-0.5' : ''}`} />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white gap-4">
          <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-300 border-4 border-indigo-100/50">
            <Send className="w-8 h-8 ml-1" />
          </div>
          <h3 className="text-xl font-extrabold text-gray-800">Your Private Messages</h3>
          <p className="text-sm text-gray-500 font-medium max-w-sm">Select a colleague from the list on the left to start a direct, secure conversation.</p>
        </div>
      )}
    </div>
  );
}
