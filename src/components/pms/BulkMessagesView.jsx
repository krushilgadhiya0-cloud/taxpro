import React, { useState } from 'react';
import { MessageSquare, Send, CheckCircle2 } from 'lucide-react';

export default function BulkMessagesView({ onShowToast }) {
  const [template, setTemplate] = useState('gst_reminder');
  const [message, setMessage] = useState('Dear Client, Please provide your June GST purchase & sales data for return filing.');

  const handleSend = (e) => {
    e.preventDefault();
    onShowToast && onShowToast('✓ Bulk WhatsApp & Email Broadcast initiated to 42 clients!', 'success');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f3f4f6] min-h-screen text-gray-800">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold font-outfit text-[#1e1e2d]">Bulk Messaging Center</h1>
        <p className="text-xs text-gray-500 mt-1">Broadcast automated WhatsApp, SMS, and Email compliance reminders to clients.</p>
      </div>

      <div className="max-w-2xl bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
        <form onSubmit={handleSend} className="flex flex-col gap-4 text-xs">
          <div>
            <label className="font-semibold text-gray-700 block mb-1">Select Message Template</label>
            <select 
              value={template} 
              onChange={e => setTemplate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-indigo-500"
            >
              <option value="gst_reminder">GST 3B Return Reminder</option>
              <option value="itr_notice">Income Tax Audit Due Date Notice</option>
              <option value="fee_reminder">Outstanding Fee Invoice Reminder</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-gray-700 block mb-1">Broadcast Message Body</label>
            <textarea 
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-indigo-500 text-xs"
            />
          </div>

          <button type="submit" className="py-3 bg-[#5b52e0] text-white font-bold rounded-xl hover:bg-[#4c44cf] flex items-center justify-center gap-2 shadow-md">
            <Send className="w-4 h-4" /> Send Bulk Broadcast to 42 Clients
          </button>
        </form>
      </div>
    </div>
  );
}
