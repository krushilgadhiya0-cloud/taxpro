import React, { useState } from 'react';
import { CheckCircle2, Sparkles, Zap, ShieldCheck, Mail, Phone } from 'lucide-react';

export default function PricingSection({ onOpenAuth }) {
  const [billing, setBilling] = useState('monthly');

  const plans = [
    {
      name: 'Startup Core',
      desc: 'Ideal for early-stage fintechs & small teams',
      price: billing === 'monthly' ? '₹999' : '₹799',
      features: [
        'Up to 25 Active Workers',
        'Basic Payroll Auto-Dispatches',
        'Standard OTP Verification',
        'Weekly Financial Reports',
        'Community AI Assistant'
      ],
      popular: false,
      btnText: '14-Day Free Trial for ₹1 (Autopay On)'
    },
    {
      name: 'Fintech Enterprise',
      desc: 'For rapidly scaling companies & banks',
      price: '₹1,999',
      features: [
        'Unlimited Active Workforce',
        'Razorpay Instant Multi-Rail UPI & Card Payments',
        'Signature Ring OTP & Biometric Suite',
        'Live Real-time AI Expense Predictions',
        'SOC2 Type II Audit & Heatmaps',
        '24/7 Dedicated Support'
      ],
      popular: true,
      btnText: 'Pay ₹1,999 via Razorpay'
    },
    {
      name: 'Custom Banking',
      desc: 'Dedicated infrastructure for financial institutions',
      price: 'Custom',
      features: [
        'On-Premise Private Quantum Node',
        'Custom Biometric Hardware SDK',
        'Bespoke AI Neural Fine-tuning',
        'SLA 99.999% Uptime Guarantee',
        'White-label Brand System'
      ],
      popular: false,
      btnText: 'Contact Banking Team'
    }
  ];

  return (
    <div className="pt-24 pb-16 min-h-screen relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Header Bar */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30">
          Transparent Pricing
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white font-outfit mt-4">
          Flexible Plans for Next-Gen Finance
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-3">
          Scale effortlessly from early startup to global banking tier with zero hidden transaction surcharges.
        </p>

        {/* Monthly / Yearly Toggle */}
        <div className="mt-8 inline-flex items-center gap-3 p-1.5 rounded-2xl bg-white/[0.04] border border-white/10">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              billing === 'monthly' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-gray-400'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBilling('yearly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              billing === 'yearly' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-gray-400'
            }`}
          >
            Yearly Billing <span className="text-[10px] text-emerald-400 font-extrabold ml-1">(Save 20%)</span>
          </button>
        </div>
      </div>

      {/* PRICING CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((p, idx) => (
          <div
            key={idx}
            className={`glass-panel p-8 glass-panel-hover flex flex-col justify-between relative ${
              p.popular ? 'border-cyan-400/60 shadow-2xl shadow-cyan-500/20 scale-105 bg-cyan-500/[0.03]' : ''
            }`}
          >
            {p.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 text-black text-[10px] font-black uppercase tracking-widest shadow-md">
                MOST POPULAR
              </div>
            )}

            <div>
              <h3 className="text-xl font-bold text-white font-outfit">{p.name}</h3>
              <p className="text-xs text-gray-400 mt-1">{p.desc}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white font-outfit">{p.price}</span>
                {p.price !== 'Custom' && <span className="text-xs text-gray-400">/ month</span>}
              </div>

              <div className="mt-8 flex flex-col gap-3">
                {p.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => onOpenAuth('login')}
              className={`mt-8 w-full py-3.5 rounded-xl text-xs font-bold transition-all ${
                p.popular ? 'btn-neon-primary shadow-lg shadow-cyan-500/30' : 'btn-glass-secondary'
              }`}
            >
              {p.btnText}
            </button>
          </div>
        ))}
      </div>

      {/* Contact Us Section */}
      <div className="mt-16 flex flex-col items-center justify-center text-center">
        <h3 className="text-xl font-bold text-white font-outfit mb-2">Need a custom plan?</h3>
        <p className="text-xs text-gray-400 mb-6 max-w-md mx-auto">Get in touch with our enterprise sales team for dedicated infrastructure and volume discounts.</p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
          <a href="mailto:krushilgadhiya138@gmail.com" className="flex items-center gap-2 text-cyan-300 hover:text-cyan-200 transition-colors bg-cyan-500/10 px-5 py-2.5 rounded-full border border-cyan-500/20 shadow-sm font-bold">
            <Mail className="w-4 h-4" /> krushilgadhiya138@gmail.com
          </a>
          <a href="https://wa.me/919327397851" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-emerald-300 hover:text-emerald-200 transition-colors bg-emerald-500/10 px-5 py-2.5 rounded-full border border-emerald-500/20 shadow-sm font-bold">
            <Phone className="w-4 h-4" /> +91 9327397851
          </a>
        </div>
      </div>

    </div>
  );
}
