import React, { useState } from 'react';
import { Calendar, Mail, MessageCircle, Check, Info, Settings, Clock } from 'lucide-react';

export default function IntegrationsView({ onShowToast }) {

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f9fafb] min-h-screen text-gray-800">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold font-outfit text-gray-900">Integrations</h1>
        <p className="text-sm text-gray-500 mt-1">Manage active system connections, external messaging nodes, and calendar synchronizations.</p>
      </div>

      {/* Grid container */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        
        {/* Google Calendar Card */}
        <div className="bg-white border border-gray-200 rounded-[20px] p-6 shadow-sm flex flex-col gap-5">
           <div className="flex justify-between items-start">
              <div className="flex gap-4 items-center">
                 <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-md flex-shrink-0">
                    <Calendar className="w-6 h-6 text-white" />
                 </div>
                 <div>
                    <h3 className="font-bold text-gray-900 text-lg">Google Calendar</h3>
                    <p className="text-gray-500 text-xs mt-0.5">Sync tasks with due dates to your calendar</p>
                 </div>
              </div>
              <div className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-[11px] font-bold">
                 Coming soon
              </div>
           </div>

           <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex gap-3 mt-1 items-start">
              <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-500 font-medium">Google Calendar sync is on the way. We'll notify you when it's ready.</p>
           </div>

           <div className="mt-auto pt-4">
              <button disabled className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-400 font-bold text-sm rounded-xl w-max cursor-not-allowed">
                 Coming soon
              </button>
           </div>
        </div>

        {/* WhatsApp Business Card */}
        <div className="bg-white border border-gray-200 rounded-[20px] p-6 shadow-sm flex flex-col gap-5">
           <div className="flex justify-between items-start">
              <div className="flex gap-4 items-center">
                 <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center shadow-md flex-shrink-0">
                    <MessageCircle className="w-6 h-6 text-white" />
                 </div>
                 <div>
                    <h3 className="font-bold text-gray-900 text-lg">WhatsApp Business</h3>
                    <p className="text-gray-500 text-xs mt-0.5">Send task alerts via your own WhatsApp channel</p>
                 </div>
              </div>
              <div className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[11px] font-bold flex items-center gap-1">
                 <Check className="w-3 h-3" /> Default
              </div>
           </div>

           <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex gap-3 mt-1 items-start">
              <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                 Currently using default TaxPro WhatsApp channel. Add your own WhatsApp Business API credentials to send alerts from your number.
              </p>
           </div>

           <div className="flex flex-col gap-3 font-medium text-sm text-gray-600 mt-2">
             <div className="flex items-center gap-2">
                 <Check className="w-4 h-4 text-[#25D366]" /> Task assignment notifications
             </div>
             <div className="flex items-center gap-2">
                 <Check className="w-4 h-4 text-[#25D366]" /> Due date reminders
             </div>
             <div className="flex items-center gap-2">
                 <Check className="w-4 h-4 text-[#25D366]" /> Status update alerts
             </div>
             <div className="flex items-center gap-2">
                 <Check className="w-4 h-4 text-[#25D366]" /> Approval request notifications
             </div>
           </div>

           <div className="mt-4">
              <button 
                onClick={() => onShowToast && onShowToast('WhatsApp API Configuration opening...', 'info')}
                className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                 <Settings className="w-4 h-4" /> Setup Custom WhatsApp
              </button>
           </div>
        </div>

        {/* Email SMTP Card */}
        <div className="bg-white border border-gray-200 rounded-[20px] p-6 shadow-sm flex flex-col gap-5">
           <div className="flex justify-between items-start">
              <div className="flex gap-4 items-center">
                 <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-md flex-shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                 </div>
                 <div>
                    <h3 className="font-bold text-gray-900 text-lg">Email (SMTP)</h3>
                    <p className="text-gray-500 text-xs mt-0.5">Send task alerts via your own email server</p>
                 </div>
              </div>
              <div className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[11px] font-bold flex items-center gap-1">
                 <Check className="w-3 h-3" /> Default
              </div>
           </div>

           <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex gap-3 mt-1 items-start">
              <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                 Currently using default TaxPro email service. Add your own SMTP server to send alerts from your domain.
              </p>
           </div>

           <div className="flex flex-col gap-3 font-medium text-sm text-gray-600 mt-2">
             <div className="flex items-center gap-2">
                 <Check className="w-4 h-4 text-[#25D366]" /> Send from your own email domain
             </div>
             <div className="flex items-center gap-2">
                 <Check className="w-4 h-4 text-[#25D366]" /> Custom branding in emails
             </div>
             <div className="flex items-center gap-2">
                 <Check className="w-4 h-4 text-[#25D366]" /> Full delivery control
             </div>
           </div>

           <div className="mt-4">
              <button 
                onClick={() => onShowToast && onShowToast('SMTP Server Configuration opening...', 'info')}
                className="w-full py-3 bg-[#1e1e2d] hover:bg-black text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                 <Settings className="w-4 h-4" /> Setup Custom SMTP
              </button>
           </div>
        </div>

      </div>
    </div>
  );
}
