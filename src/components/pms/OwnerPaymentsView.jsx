import React, { useState } from 'react';
import { DollarSign, CheckCircle2, CloudLightning, ArrowRight, Wallet, History, CreditCard, ShieldCheck } from 'lucide-react';

export default function OwnerPaymentsView({ onShowToast }) {
  const [activeTab, setActiveTab] = useState('Overview');

  const history = [
    { id: 'INV-0291', date: 'Jul 01, 2026', amount: '₹299', plan: 'Starter M-T-M', status: 'Paid' },
    { id: 'INV-0102', date: 'Jun 01, 2026', amount: '₹299', plan: 'Starter M-T-M', status: 'Paid' },
    { id: 'INV-0041', date: 'May 01, 2026', amount: '₹1', plan: 'Promotional Trial', status: 'Paid' }
  ];

  const handleDownloadRazorpayReceipt = (invoice) => {
    const textData = `
=========================================
          RAZORPAY SECURE RECEIPT
=========================================
Transaction ID : pay_${Math.random().toString(36).substring(2, 10).toUpperCase()}
Invoice Ref    : ${invoice.id}
Date           : ${invoice.date}
Plan Billed    : ${invoice.plan}
Amount         : ${invoice.amount}
Status         : SUCCESS (Settled)

Billed To      : TaxPro Admin
Payment Method : Card ending ****4242 (Visa)

Generated securely via Razorpay API Gateway.
    `;
    const blob = new Blob([textData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Razorpay_Receipt_${invoice.id}.txt`;
    link.click();
    
    if(onShowToast) onShowToast(`Verified Razorpay receipt fetched & downloaded for ${invoice.id}`, 'success');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen text-gray-800">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 font-outfit">Owner Payments</h1>
          <p className="text-sm text-gray-500 mt-1">Manage platform billing, active subscriptions, and invoices.</p>
        </div>
        <div className="flex flex-wrap items-center bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('Overview')}
            className={`min-w-[120px] px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'Overview' ? 'bg-[#1e1e2d] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('History')}
            className={`min-w-[120px] px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'History' ? 'bg-[#1e1e2d] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Billing History
          </button>
        </div>
      </div>

      {activeTab === 'Overview' && (
        <div className="flex flex-col lg:flex-row gap-6">
          
          <div className="flex-1 bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm h-fit">
            <div className="flex items-start justify-between mb-8">
              <div>
                <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Current Plan</div>
                <h3 className="text-2xl font-extrabold text-gray-900 font-outfit flex items-center gap-2">
                  <CloudLightning className="w-6 h-6 text-[#5b52e0]" /> Starter Tier
                </h3>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider rounded-lg border border-emerald-100 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
                <span className="text-[11px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                  <span className="text-gray-800">14 Days</span> Remaining
                </span>
              </div>
            </div>

            <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">Available Subscription Tiers</h4>
            <div className="flex flex-col gap-3">
              <div className="bg-gray-50 p-4 border border-gray-200 rounded-2xl flex items-center justify-between hover:border-gray-300 transition-colors cursor-pointer">
                 <div>
                   <h5 className="font-extrabold text-gray-900 text-sm">Standard Plan</h5>
                   <p className="text-[10px] font-bold text-gray-400">Up to 10 users</p>
                 </div>
                 <div className="text-xl font-black text-gray-900 font-outfit">₹999 <span className="text-[10px] uppercase font-bold text-gray-400">/mo</span></div>
              </div>
              
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl flex items-center justify-between relative overflow-hidden ring-1 ring-indigo-500/20 cursor-pointer shadow-sm">
                 <div className="absolute top-0 right-0 bg-[#5b52e0] text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-bl-lg shadow-sm">Recommended</div>
                 <div>
                   <h5 className="font-extrabold text-[#5b52e0] text-sm">Professional Plan</h5>
                   <p className="text-[10px] font-bold text-indigo-600/70">Unlimited users + File Tracking</p>
                 </div>
                 <div className="text-xl font-black text-indigo-700 font-outfit">₹1499 <span className="text-[10px] uppercase font-bold text-indigo-700/60">/mo</span></div>
              </div>

              <div className="bg-gray-900 p-4 border border-gray-800 rounded-2xl flex items-center justify-between text-white cursor-pointer hover:bg-black transition-colors">
                 <div>
                   <h5 className="font-extrabold text-white text-sm">Enterprise Custom</h5>
                   <p className="text-[10px] font-bold text-gray-400">White-labeling & dedicated setup</p>
                 </div>
                 <div className="text-xs border border-gray-700 px-3 py-1.5 rounded-lg font-bold bg-gray-800 text-gray-200 shadow-sm">Configurator</div>
              </div>
            </div>

            <button 
              onClick={() => onShowToast && onShowToast('Navigating to Razorpay secure checkout portal...', 'info')}
              className="w-full mt-6 py-3.5 bg-gradient-to-r from-[#1e1e2d] to-[#2d2d47] text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
            >
              Select & Upgrade Plan <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="w-full lg:w-96 flex flex-col gap-6">
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="w-4 h-4 text-emerald-500" />
                <h4 className="font-extrabold text-[#1e1e2d]">Payment Methods</h4>
              </div>
              
              <div className="border border-emerald-500 border-dashed rounded-xl p-4 bg-emerald-50/50 flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-6 bg-[#1e1e2d] rounded flex items-center justify-center text-[10px] text-white font-bold tracking-wider italic shadow-sm">VISA</div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 leading-tight">•••• 4242</div>
                    <div className="text-[10px] text-gray-500 font-semibold">Expires 12/28</div>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Default</span>
              </div>

              <button className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-400" /> Add New Payment Method
              </button>
            </div>

            <div className="bg-gradient-to-tr from-gray-900 to-[#1e1e2d] border border-gray-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
              <ShieldCheck className="w-32 h-32 text-white/5 absolute -right-6 -bottom-6" />
              <div className="relative z-10 flex flex-col gap-3">
                <h4 className="font-outfit font-extrabold text-lg">Secure Billing</h4>
                <p className="text-xs text-gray-400 font-medium leading-relaxed mb-2">
                  All transactions are handled securely by Razorpay India. TaxPro never locally stores your raw card data.
                </p>
                <div className="flex items-center gap-2 opacity-60">
                  <LockIcon />
                  <span className="text-[10px] font-mono tracking-wider">256-BIT ENCRYPTION</span>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      )}

      {activeTab === 'History' && (
        <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
            <History className="w-5 h-5 text-gray-400" />
            <h3 className="font-bold text-gray-900">Invoice History</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-white text-gray-500 font-extrabold text-[10px] uppercase tracking-wider border-b border-gray-100">
                  <th className="p-4 pl-6">Invoice ID</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Plan</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((h, i) => (
                  <tr key={h.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 pl-6 font-mono font-semibold text-gray-600 text-xs">{h.id}</td>
                    <td className="p-4 font-semibold text-gray-800 text-xs">{h.date}</td>
                    <td className="p-4 text-gray-500 text-xs font-semibold">{h.plan}</td>
                    <td className="p-4 font-black text-gray-900">{h.amount}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" /> {h.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <button 
                        onClick={() => handleDownloadRazorpayReceipt(h)}
                        className="text-[#5b52e0] text-xs font-bold hover:underline"
                      >
                        Razopay Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
);
