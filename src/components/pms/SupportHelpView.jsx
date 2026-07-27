import React, { useState } from 'react';
import { LifeBuoy, Book, MessageCircle, CalendarClock, Send, CheckCircle2, Bot, Phone, ChevronRight } from 'lucide-react';

export default function SupportHelpView({ onShowToast }) {
  const [activeTab, setActiveTab] = useState('kb'); // 'kb', 'ai', 'meeting'
  
  // Meeting State
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ date: '', time: '', desc: '' });

  // AI Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'AI', text: 'Hello! I am your TaxPro Support AI. How can I assist you with the platform today?' }
  ]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const newChat = [...chatMessages, { sender: 'User', text: chatInput }];
    setChatMessages(newChat);
    setChatInput('');
    
    setTimeout(() => {
      setChatMessages(prev => [...prev, { 
        sender: 'AI', 
        text: 'I understand you need help with that. For specific internal workflows, consider checking our Knowledge Base or booking a direct meeting with a support expert.' 
      }]);
    }, 1000);
  };

  const handleBooking = (e) => {
    e.preventDefault();
    if (!meetingForm.date || !meetingForm.time) return;
    
    setIsBooking(true);
    if(onShowToast) onShowToast('Processing target schedule...', 'info');
    
    setTimeout(() => {
      setIsBooking(false);
      setBookingSuccess(true);
      if(onShowToast) onShowToast('✓ Consultation approved securely.', 'success');
    }, 1500);
  };

  const topics = [
    { title: 'Dashboard & Integrations', desc: 'The central nervous system. View high-level metrics, global alerts, and synchronize Google Calendar, WhatsApp, and Gmail via the Integrations menu.' },
    { title: 'Task & Workload Management', desc: 'Create internal tasks, assign them to team members, track due dates, and monitor global firm workload capacity without exposing internal data structures.' },
    { title: 'Client & Contact Person', desc: 'Securely map client entities to specific contact persons. Includes full lifecycle toggling (Active vs Old Clients) and detailed historical payment printing.' },
    { title: 'Fees & Owner Payments', desc: 'Track comprehensive billed amounts against collected fees. The Owner Payments module natively integrates subscription tiers and secure Razorpay receipt generation.' },
    { title: 'Firm Settings & Reports', desc: 'Centralized hub for CSV exports of all operational data. Configure global language settings, dark mode states, and print official firm profiles safely.' }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f3f4f6] min-h-screen text-gray-800">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold font-outfit text-[#1e1e2d] flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-[#0f766e]" /> Support & Knowledge Base
          </h1>
          <p className="text-xs text-gray-500 mt-1">Platform documentation, automated AI assistance, and expert consultation scheduling.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-2xl p-1 mb-6 border border-gray-200 shadow-sm max-w-xl">
        <button 
          onClick={() => setActiveTab('kb')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'kb' ? 'bg-[#0f766e] text-white shadow-md' : 'text-gray-500 hover:bg-teal-50'}`}
        >
          <Book className="w-4 h-4" /> Platform Guide
        </button>
        <button 
          onClick={() => setActiveTab('ai')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'ai' ? 'bg-[#0f766e] text-white shadow-md' : 'text-gray-500 hover:bg-teal-50'}`}
        >
          <Bot className="w-4 h-4" /> Scripted AI Bot
        </button>
        <button 
          onClick={() => setActiveTab('meeting')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'meeting' ? 'bg-[#0f766e] text-white shadow-md' : 'text-gray-500 hover:bg-teal-50'}`}
        >
          <CalendarClock className="w-4 h-4" /> Request Expert
        </button>
      </div>

      <div className="w-full">
        
        {/* KNOWLEDGE BASE TAB */}
        {activeTab === 'kb' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in text-gray-800">
             {topics.map((t, i) => (
                <div key={i} className="bg-white border border-gray-200 p-5 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 mb-3">
                     <Book className="w-5 h-5" />
                  </div>
                  <h3 className="font-extrabold text-gray-900 mb-2">{t.title}</h3>
                  <p className="text-xs text-gray-600 font-medium leading-relaxed">{t.desc}</p>
                </div>
             ))}
             
             <div className="bg-[#1e1e2d] border border-gray-800 p-5 rounded-3xl shadow-sm flex flex-col justify-center items-center text-center">
                <LifeBuoy className="w-8 h-8 text-teal-400 mb-3" />
                <h3 className="font-extrabold text-white mb-2 text-lg">Need further assistance?</h3>
                <p className="text-xs text-gray-400 font-medium mb-4">Our automated systems and support experts are standing by to resolve complex operational tasks securely.</p>
                <button onClick={() => setActiveTab('meeting')} className="px-5 py-2.5 bg-[#0f766e] hover:bg-teal-600 text-white font-bold text-xs rounded-xl transition-colors">
                  Contact an Expert
                </button>
             </div>
          </div>
        )}

        {/* AI BOT TAB */}
        {activeTab === 'ai' && (
          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[500px] max-w-3xl animate-fade-in relative z-0">
             <div className="bg-[#0f766e] p-4 text-white flex items-center gap-3 relative z-10">
               <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center relative">
                 <Bot className="w-6 h-6" />
                 <div className="absolute top-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-[#0f766e]"></div>
               </div>
               <div>
                  <h3 className="font-extrabold font-outfit text-lg leading-tight">TaxPro Assistant</h3>
                  <p className="text-[10px] text-teal-100 font-medium tracking-wide">Automated Scripted Responder</p>
               </div>
             </div>

             <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-4">
                 {chatMessages.map((msg, i) => (
                   <div key={i} className={`flex ${msg.sender === 'User' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[75%] p-3 text-sm rounded-2xl shadow-sm ${
                       msg.sender === 'User' 
                       ? 'bg-[#5b52e0] text-white rounded-br-none' 
                       : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                     }`}>
                       {msg.text}
                     </div>
                   </div>
                 ))}
             </div>

             <div className="p-3 bg-white border-t border-gray-200 relative z-10">
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                    placeholder="Type your question here..." 
                    className="flex-1 bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-[#0f766e]"
                  />
                  <button 
                    onClick={handleSendChat}
                    className="w-10 h-10 rounded-xl bg-[#0f766e] hover:bg-teal-700 flex items-center justify-center text-white shadow-md transition-colors flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
             </div>
          </div>
        )}

        {/* MEETING & CONTACT TAB */}
        {activeTab === 'meeting' && (
          <div className="max-w-2xl animate-fade-in relative z-0">
             {!bookingSuccess ? (
               <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm">
                 <div className="mb-6 border-b border-gray-100 pb-4">
                   <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                     <CalendarClock className="w-5 h-5 text-[#5b52e0]" /> Schedule Support Meeting
                   </h2>
                   <p className="text-xs text-gray-500 mt-1 font-medium">Select a time to speak directly with our deployment engineers.</p>
                 </div>

                 <form onSubmit={handleBooking} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1">Target Date</label>
                        <input 
                          type="date" 
                          required
                          value={meetingForm.date}
                          onChange={e => setMeetingForm({...meetingForm, date: e.target.value})}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#5b52e0] text-sm text-gray-800" 
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1">Preferred Time</label>
                        <input 
                          type="time" 
                          required
                          value={meetingForm.time}
                          onChange={e => setMeetingForm({...meetingForm, time: e.target.value})}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#5b52e0] text-sm text-gray-800" 
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Meeting Purpose / Description</label>
                      <textarea 
                        rows="4" 
                        required
                        value={meetingForm.desc}
                        onChange={e => setMeetingForm({...meetingForm, desc: e.target.value})}
                        placeholder="Briefly describe what you need assistance with..."
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#5b52e0] text-sm text-gray-800 resize-none"
                      ></textarea>
                    </div>

                    <button 
                      type="submit"
                      disabled={isBooking}
                      className={`w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md transition-all flex justify-center items-center gap-2 mt-2 ${
                        isBooking ? 'bg-indigo-400 cursor-not-allowed' : 'bg-[#5b52e0] hover:bg-[#4c44cf]'
                      }`}
                    >
                      {isBooking ? 'Synchronizing Schedule...' : 'Request Approval'}
                    </button>
                 </form>
               </div>
             ) : (
               <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 shadow-sm text-center flex flex-col items-center">
                 <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4 shadow-sm border border-emerald-200 ring-4 ring-emerald-50">
                    <CheckCircle2 className="w-8 h-8" />
                 </div>
                 <h2 className="text-2xl font-extrabold text-emerald-900 mb-2 font-outfit">Meeting Approved!</h2>
                 <p className="text-sm text-emerald-700 font-medium max-w-md mx-auto mb-8">
                   Your consultation request has been successfully processed and locked into the target schedule.
                 </p>
                 
                 <div className="w-full p-6 bg-white border border-emerald-100 rounded-2xl shadow-sm text-center">
                   <div className="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">Direct Contact Vector</div>
                   <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center justify-center gap-2">
                     <Phone className="w-5 h-5 text-emerald-500" /> +91 93273 97861
                   </h3>
                   <p className="text-xs text-gray-500 font-medium">
                     Please connect via WhatsApp at the scheduled time to initiate the consultation sequence.
                   </p>
                 </div>
                 
                 <button onClick={() => setBookingSuccess(false)} className="mt-6 text-emerald-600 text-xs font-bold hover:underline">
                   Book another session
                 </button>
               </div>
             )}
          </div>
        )}

      </div>
    </div>
  );
}
