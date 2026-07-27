import React, { useState } from 'react';
import { Zap, Calendar, Mail, MessageSquare, CheckSquare, RefreshCw, ExternalLink, CalendarDays, Inbox } from 'lucide-react';

export default function IntegrationsView({ onShowToast }) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    if(onShowToast) onShowToast('Initiating secure sync with Google Workspace & Mail servers...', 'info');
    setTimeout(() => {
      setIsSyncing(false);
      if(onShowToast) onShowToast('✓ All systems successfully synchronized.', 'success');
    }, 2000);
  };

  const unifiedFeed = [
    { type: 'google', title: 'Client Meeting: Acme Corp', time: 'Today, 2:00 PM', desc: 'Google Calendar Event • Sync Active', icon: <CalendarDays className="w-4 h-4 text-blue-600" />, color: 'bg-blue-50 border-blue-100' },
    { type: 'mail', title: 'FW: Statutory Audit Documents', time: 'Today, 11:30 AM', desc: 'Gmail Inbox • Received from alex@sterling.com', icon: <Mail className="w-4 h-4 text-rose-600" />, color: 'bg-rose-50 border-rose-100' },
    { type: 'chat', title: 'Priya Sharma (Private Chat)', time: 'Yesterday', desc: '"Hey, I have uploaded the DIR-3 forms on the portal. Please review." ', icon: <MessageSquare className="w-4 h-4 text-emerald-600" />, color: 'bg-emerald-50 border-emerald-100' },
    { type: 'task', title: 'Task Assignment Auto-Sync', time: 'Yesterday', desc: 'You were assigned to "TDS Return Filing" internally.', icon: <CheckSquare className="w-4 h-4 text-indigo-600" />, color: 'bg-indigo-50 border-indigo-100' },
    { type: 'google', title: 'Income Tax Audit Deadline', time: 'Next Week', desc: 'Google Calendar Event • Target: Sterling Capital', icon: <CalendarDays className="w-4 h-4 text-blue-600" />, color: 'bg-blue-50 border-blue-100' }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f3f4f6] min-h-screen text-gray-800">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold font-outfit text-[#1e1e2d] flex items-center gap-2">
            <Zap className="w-6 h-6 text-[#5b52e0]" /> Systems & Integrations Hub
          </h1>
          <p className="text-xs text-gray-500 mt-1">Centralized dashboard for Google Calendar, Universal Inbox (Email/Chat), and third-party APIs.</p>
        </div>

        <button 
          onClick={handleSync}
          disabled={isSyncing}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm shadow-md transition-all ${isSyncing ? 'bg-indigo-400 cursor-not-allowed' : 'bg-[#5b52e0] hover:bg-[#4c44cf]'}`}
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing APIs...' : 'Force Sync Data'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Unified Inbox / Activity */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
                <Inbox className="w-5 h-5 text-[#5b52e0]" /> Unified Inbox Feed
              </h3>
              <div className="flex gap-2">
                <span className="px-2 py-1 rounded bg-rose-50 text-rose-600 text-[10px] font-bold uppercase">Gmail Active</span>
                <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase">Chat Linked</span>
              </div>
            </div>

            <div className="space-y-4">
              {unifiedFeed.map((item, idx) => (
                <div key={idx} className={`p-4 rounded-xl border ${item.color} flex gap-4 transition-all hover:shadow-md cursor-pointer`}>
                  <div className="mt-1 flex-shrink-0">
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                      {item.icon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-sm text-gray-900 truncate">{item.title}</h4>
                      <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap ml-2">{item.time}</span>
                    </div>
                    <p className="text-xs text-gray-600 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-6 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors">
              Load Older Messages...
            </button>
          </div>
        </div>

        {/* Right Column: Integration Settings & Calendar Block */}
        <div className="flex flex-col gap-6">
          
          {/* Calendar Widget */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
            <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-blue-600" /> Google Calendar 
            </h3>
            
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col items-center justify-center text-center mb-4">
               <div className="text-2xl font-black text-blue-700 mb-0.5">{new Date().getDate()}</div>
               <div className="text-xs font-bold text-blue-600/70 uppercase tracking-widest">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
            </div>

            <div className="space-y-3">
               <div className="flex items-center gap-3">
                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                 <div className="flex-1">
                   <div className="text-xs font-bold text-gray-800">Q2 GST Review</div>
                   <div className="text-[10px] text-gray-400">10:00 AM - 11:30 AM</div>
                 </div>
               </div>
               <div className="flex items-center gap-3">
                 <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                 <div className="flex-1">
                   <div className="text-xs font-bold text-gray-800">Client Call: NexGen</div>
                   <div className="text-[10px] text-gray-400">2:00 PM - 2:30 PM</div>
                 </div>
               </div>
            </div>

            <button className="w-full mt-4 py-2 border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5">
              Open Google Calendar <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Active Connectors */}
          <div className="bg-[#1e1e2d] border border-gray-800 rounded-3xl p-6 shadow-xl text-white">
            <h3 className="font-bold text-sm flex items-center gap-2 mb-5">
              Active Connectors
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center"><Mail className="w-4 h-4 text-gray-300" /></div>
                  <div>
                    <div className="text-xs font-bold text-white">Workspace Gmail</div>
                    <div className="text-[10px] text-emerald-400">Connected</div>
                  </div>
                </div>
                <div className="w-10 h-5 bg-emerald-500 rounded-full cursor-pointer relative">
                  <div className="w-3 h-3 bg-white rounded-full absolute top-1 right-1"></div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center"><CalendarDays className="w-4 h-4 text-gray-300" /></div>
                  <div>
                    <div className="text-xs font-bold text-white">Google Calendar</div>
                    <div className="text-[10px] text-emerald-400">Connected</div>
                  </div>
                </div>
                <div className="w-10 h-5 bg-emerald-500 rounded-full cursor-pointer relative">
                  <div className="w-3 h-3 bg-white rounded-full absolute top-1 right-1"></div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center"><MessageSquare className="w-4 h-4 text-gray-300" /></div>
                  <div>
                    <div className="text-xs font-bold text-white">Slack / Teams</div>
                    <div className="text-[10px] text-gray-500">Not Configured</div>
                  </div>
                </div>
                <div className="w-10 h-5 bg-gray-700 rounded-full cursor-pointer relative">
                  <div className="w-3 h-3 bg-white rounded-full absolute top-1 left-1"></div>
                </div>
              </div>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}
