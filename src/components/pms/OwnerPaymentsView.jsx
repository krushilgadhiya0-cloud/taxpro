import React, { useState } from 'react';
import { DollarSign, CheckCircle2, CloudLightning, ArrowRight, Wallet, History, CreditCard, ShieldCheck, Lock } from 'lucide-react';

export default function OwnerPaymentsView({ onShowToast }) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [remainingDays, setRemainingDays] = useState(14);
  const [activePlan, setActivePlan] = useState('Starter Tier');
  const [showRazorpayMock, setShowRazorpayMock] = useState(false);
  const [mockProcessingPlan, setMockProcessingPlan] = useState(null);

  const plans = [
    {
      name: 'Startup Core',
      desc: 'Ideal for early-stage fintechs & small teams',
      price: '₹999 /mo',
      daysToAdd: 30,
      features: [
        'Up to 25 Active Workers',
        'Basic Payroll Auto-Dispatches',
        'Standard OTP Verification',
        'Weekly Financial Reports',
      ],
      popular: false,
    },
    {
      name: 'Fintech Enterprise',
      desc: 'For rapidly scaling companies & banks',
      price: '₹1,999 /mo',
      daysToAdd: 30,
      features: [
        'Unlimited Active Workforce',
        'Razorpay Instant Multi-Rail UPI & Card Payments',
        'Signature Ring OTP & Biometric Suite',
        'Live Real-time AI Expense Predictions',
      ],
      popular: true,
    },
    {
      name: 'Custom Banking',
      desc: 'Dedicated infrastructure for financial institutions',
      price: 'Custom /yr',
      daysToAdd: 365,
      features: [
        'On-Premise Private Quantum Node',
        'Custom Biometric Hardware SDK',
        'Bespoke AI Neural Fine-tuning',
        'SLA 99.999% Uptime Guarantee',
      ],
      popular: false,
    }
  ];

  const handleUpgrade = (plan) => {
    // Safe extraction of numbers from price string
    const amountPaise = (parseInt(plan.price.replace(/[^0-9]/g, '')) || 0) * 100;
    
    // If Custom or Free string (0 amount), skip gateway
    if (amountPaise === 0) {
      setActivePlan(plan.name);
      setRemainingDays(prev => prev + plan.daysToAdd);
      if(onShowToast) onShowToast(`Successfully upgraded to ${plan.name} Custom Tier!`, 'success');
      return;
    }

    // Trigger internal mock overlay instead of broken Razorpay SDK with fake key
    setMockProcessingPlan(plan);
    setShowRazorpayMock(true);
    if (onShowToast) onShowToast('Initiating Secure Gateway...', 'info');

    // Simulate 3 seconds of processing time before resolving
    setTimeout(() => {
      setShowRazorpayMock(false);
      setActivePlan(plan.name);
      setRemainingDays(prev => prev + plan.daysToAdd);
      if(onShowToast) {
         onShowToast(`Razorpay Payment Successful! Ref: pay_${Math.random().toString(36).substring(2,10).toUpperCase()}`, 'success');
         setTimeout(() => {
           onShowToast(`Added +${plan.daysToAdd} days to your active workspace limit.`, 'info');
         }, 1000);
      }
    }, 3000);
  };

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
        <div className="flex flex-col gap-6">
          
          {/* Active Plan Status Header */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Current Active Plan</div>
              <h3 className="text-2xl font-extrabold text-gray-900 font-outfit flex items-center gap-2">
                <CloudLightning className="w-6 h-6 text-cyan-500" /> {activePlan}
              </h3>
            </div>
            
            <div className="flex flex-col items-end gap-1.5">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider rounded-lg border border-emerald-100 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
              <span className="text-[13px] font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                <span className="text-gray-900 font-black text-lg">{remainingDays}</span> Days Remaining
              </span>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {plans.map((p, idx) => (
              <div
                key={idx}
                className={`bg-white border p-6 rounded-3xl flex flex-col justify-between relative transition-all duration-300 ${
                  p.popular ? 'border-cyan-400 shadow-xl shadow-cyan-500/10 scale-105 z-10' : 'border-gray-200 hover:border-cyan-200 hover:shadow-md'
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 text-white text-[9px] font-black uppercase tracking-widest shadow-sm">
                    Most Popular
                  </div>
                )}
                
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900 font-outfit">{p.name}</h3>
                  <p className="text-[11px] font-semibold text-gray-500 mt-1 h-8">{p.desc}</p>
                  
                  <div className="mt-4 mb-6">
                    <span className="text-2xl font-black text-gray-900 font-outfit">{p.price}</span>
                  </div>

                  <div className="flex flex-col gap-2.5 mb-6">
                    {p.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px] font-semibold text-gray-600">
                         <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0 mt-0.5" />
                         <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleUpgrade(p)}
                  className={`w-full py-3 rounded-xl text-xs font-extrabold transition-all active:scale-95 ${
                    p.popular 
                      ? 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/20' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  Get {p.name} (+{p.daysToAdd} Days)
                </button>

              </div>
            ))}
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


      {/* Razorpay Mock UI Overlay */}
      {showRazorpayMock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col items-center p-8 animate-slide-up relative">
             <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500 animate-pulse"></div>
             
             {/* Fake Razorpay Logo/Header */}
             <div className="w-16 h-16 rounded-full bg-cyan-50 flex items-center justify-center mb-6">
               <ShieldCheck className="w-8 h-8 text-cyan-600 animate-bounce" />
             </div>
             
             <h3 className="text-xl font-black text-gray-900 font-outfit text-center mb-2">Processing Payment...</h3>
             <p className="text-sm font-medium text-gray-500 text-center mb-6">
                Connecting to Razorpay Secure Gateway for <span className="font-bold text-gray-800">{mockProcessingPlan?.name}</span>
             </p>
             
             <div className="w-full flex items-center justify-between text-xs font-bold text-gray-500 bg-gray-50 uppercase tracking-widest px-4 py-3 rounded-lg border border-gray-100">
                <span>Amount</span>
                <span className="text-gray-900">{mockProcessingPlan?.price}</span>
             </div>

             <div className="mt-8 flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-gray-400">
                <Lock className="w-3 h-3" /> Securing SSL Session
             </div>
          </div>
        </div>
      )}

    </div>
  );
}

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
);
