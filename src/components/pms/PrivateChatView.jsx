import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Search, CheckCheck, Smile, Paperclip, MoreVertical, Phone, Video, Users, Circle, RefreshCw, MessageSquare } from 'lucide-react';

export default function PrivateChatView({ onShowToast, preSelectedUser }) {
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const activeContactRef = useRef(activeContact);

  // Keep ref synchronized for interval callback
  useEffect(() => {
    activeContactRef.current = activeContact;
  }, [activeContact]);

  // Current logged in user info
  const currentUserEmail = (localStorage.getItem('taxpro_user_email') || 'admin@taxpro.com').toLowerCase().trim();
  const currentUserName = localStorage.getItem('taxpro_user_name') || 'Administrator';
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

  // 3. Multi-Device Real-Time Polling Engine (Every 2.5s)
  useEffect(() => {
    const interval = setInterval(() => {
      // Background silent sync
      fetchContacts(true);
      if (activeContactRef.current) {
        fetchMessages(activeContactRef.current, true);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [fetchContacts, fetchMessages]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 4. Send Message Handler (Persists directly into PostgreSQL SQL)
  const handleSend = async (e) => {
    e.preventDefault();
    const text = inputMsg.trim();
    if (!text || !activeContact || isSending) return;

    setIsSending(true);
    setInputMsg('');

    // Optimistic UI update
    const optimisticMsg = {
      id: `OPT-${Date.now()}`,
      text: text,
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
          content: text
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to deliver message.');
      }

      // Replace optimistic message with confirmed server message
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data.message : m));

      // Refresh contacts to update sidebar preview
      fetchContacts(true);
    } catch (err) {
      if (onShowToast) onShowToast(`Message delivery failed: ${err.message}`, 'error');
    } finally {
      setIsSending(false);
    }
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
    <div className="flex h-[calc(100vh-60px)] bg-[#f3f4f6]">
      
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
                    {c.online && (
                      <div className="absolute right-0 bottom-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                        {c.name}
                      </h4>
                      {c.lastMessage?.time && (
                        <span className="text-[10px] text-gray-400 font-semibold">{c.lastMessage.time}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[11px] text-gray-500 font-medium truncate flex-1">
                        {c.lastMessage?.text ? c.lastMessage.text : `${c.role} • ${c.department || 'General'}`}
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
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
            {currentUserName.substring(0, 2).toUpperCase()}
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
          <div className="h-16 border-b border-gray-100 flex flex-shrink-0 items-center justify-between px-6 bg-gray-50/40">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-sm shadow-xs">
                  {activeContact.avatar || activeContact.name?.substring(0, 2).toUpperCase()}
                </div>
                {activeContact.online && (
                  <div className="absolute right-0 bottom-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-gray-900 text-sm truncate flex items-center gap-2">
                  {activeContact.name}
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold border border-indigo-100">
                    {activeContact.role || 'Member'}
                  </span>
                </h3>
                <p className="text-[11px] text-gray-500 font-medium truncate">
                  {activeContact.email} • <span className="text-emerald-600 font-bold">{activeContact.online ? 'Online' : 'Active Member'}</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-gray-400 flex-shrink-0">
              <button 
                onClick={() => fetchMessages(activeContact)}
                title="Sync Messages"
                className="p-2 hover:bg-gray-100 rounded-full hover:text-indigo-600 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingMessages ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full hover:text-indigo-600 transition-colors cursor-pointer"><Phone className="w-4 h-4" /></button>
              <button className="p-2 hover:bg-gray-100 rounded-full hover:text-indigo-600 transition-colors cursor-pointer"><Video className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Message Thread */}
          <div className="flex-1 overflow-y-auto p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-gray-50/20 flex flex-col gap-3">
            {isLoadingMessages && messages.length === 0 ? (
              <div className="text-center w-full my-auto text-gray-400 text-xs font-semibold flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                Loading conversation from database...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center w-full my-auto text-gray-400 text-xs font-semibold max-w-sm mx-auto p-6 bg-white border border-gray-100 rounded-2xl shadow-xs">
                <Users className="w-8 h-8 text-indigo-300 mx-auto mb-2" />
                This is the start of your secure direct conversation with <strong className="text-gray-700">{activeContact.name}</strong>.
                <p className="text-[11px] text-gray-400 mt-1">Messages are saved in PostgreSQL SQL and synchronized across all connected devices.</p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex max-w-md sm:max-w-lg ${msg.isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                  <div className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm shadow-xs relative group ${
                    msg.isMe 
                      ? 'bg-[#5b52e0] text-white rounded-br-xs' 
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-xs'
                  }`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <div className={`flex items-center gap-1 mt-1 justify-end ${msg.isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                      <span className="text-[9px] font-semibold">{msg.time}</span>
                      {msg.isMe && <CheckCheck className="w-3 h-3 text-indigo-200" />}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Section */}
          <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
            <form onSubmit={handleSend} className="flex items-center gap-3">
              <button type="button" className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 transition-all rounded-full shrink-0 cursor-pointer">
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
                disabled={!inputMsg.trim() || isSending}
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform cursor-pointer ${
                  inputMsg.trim() && !isSending ? 'bg-[#5b52e0] text-white shadow-md hover:scale-105 hover:bg-[#4c44cf]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
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
              Select a team member from the directory on the left to start a real-time conversation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
