import React, { useState } from 'react';
import { CheckCircle2, Sparkles, Zap, ShieldCheck, Mail, Phone, ArrowRight, MessageSquare, CreditCard, Lock, Users } from 'lucide-react';

export default function PricingSection({ onOpenAuth, onSelectPlan, onSelectTab }) {
  const [billing, setBilling] = useState('monthly');

  const plans = [
    {
      id: 'starter_tier',
      name: 'Starter Practice',
      seats: '10 - 15 Team Members',
      seatsBadge: '10 - 15 (Manager + Employee + Admin)',
      desc: 'Perfect for small CA firms, tax consultants, and financial practices.',
      price: billing === 'monthly' ? '₹1,499' : '₹11,111',
      priceNum: billing === 'monthly' ? 1499 : 11111,
      period: billing === 'monthly' ? '/ 30 days' : '/ 1 year',
      savings: billing === 'yearly' ? 'Save ~38% on Annual License' : null,
      features: [
        '10 - 15 Members (Manager + Employee + Admin)',
        '30-Day Subscription (Autopay available on Card)',
        'Complete Practice Management Suite',
        'Signature OTP Verification Gateway',
        'Client Billing & Attendance Tracker',
        'Automated 5-Day Due Reminders'
      ],
      popular: false,
      isContact: false,
      btnText: billing === 'monthly' ? 'Choose Plan & Pay ₹1,499' : 'Choose Plan & Pay ₹11,111'
    },
    {
      id: 'growth_tier',
      name: 'Growth Practice',
      seats: '15 - 50 Team Members',
      seatsBadge: '15 - 50 (Manager + Employee + Admin)',
      desc: 'Engineered for scaling advisory firms, corporate tax teams, and multi-partner practices.',
      price: billing === 'monthly' ? '₹2,599' : '₹16,666',
      priceNum: billing === 'monthly' ? 2599 : 16666,
      period: billing === 'monthly' ? '/ month' : '/ 1 year',
      savings: billing === 'yearly' ? 'Save ~46% on Annual License' : null,
      features: [
        '15 - 50 Members (Manager + Employee + Admin)',
        'Full Multi-Department & Branch Controls',
        'Direct Card Autopay, UPI & Bank Transfer',
        'Advanced GST & TDS Audit Intelligence',
        'Priority Notification Dispatcher',
        'Dedicated Practice Success Specialist'
      ],
      popular: true,
      isContact: false,
      btnText: billing === 'monthly' ? 'Choose Plan & Pay ₹2,599' : 'Choose Plan & Pay ₹16,666'
    },
    {
      id: 'enterprise_tier',
      name: 'Enterprise Practice',
      seats: '50+ Team Members',
      seatsBadge: '50+ Custom Enterprise',
      desc: 'Bespoke infrastructure, dedicated database, and custom integrations for high-volume practices.',
      price: 'Custom Quote',
      priceNum: null,
      period: '',
      savings: null,
      features: [
        '50+ Unlimited Staff, Managers & Directors',
        'Custom Banking & ERP Data Connectors',
        'Bespoke Compliance Automation SDK',
        'Dedicated Cloud Node & White-labeling',
        '24/7 Priority Emergency Support Line',
        'Personal Implementation Lead & SLA'
      ],
      popular: false,
      isContact: true,
      btnText: 'Contact Us / Send Inquiry'
    }
  ];

  const handleAction = (p) => {
    if (p.isContact) {
      if (onSelectTab) {
        onSelectTab('contact');
      } else if (onOpenAuth) {
        onOpenAuth('login');
      }
    } else {
      if (onSelectPlan) {
        onSelectPlan({
          ...p,
          billing
        });
      } else if (onOpenAuth) {
        onOpenAuth('login');
      }
    }
  };

  return (
    <div className="pt-24 pb-16 min-h-screen relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Header Bar */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30">
          Transparent Practice Plans
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white font-outfit mt-4">
          Direct Bank Settlement Plans
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-3">
          Predictable flat-rate pricing for modern CA firms, tax practitioners, and corporate accounting teams.
        </p>

        {/* 30 Days Monthly / 1 Year Toggle */}
        <div className="mt-8 inline-flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.04] border border-white/10">
          <button
            type="button"
            onClick={() => setBilling('monthly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              billing === 'monthly' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-md shadow-cyan-500/20' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>30 Days (Monthly)</span>
            <span className="text-[10px] text-cyan-300 font-mono ml-1.5">(Autopay Available)</span>
          </button>
          <button
            type="button"
            onClick={() => setBilling('yearly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              billing === 'yearly' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-md shadow-cyan-500/20' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>1 Year (Annual)</span>
            <span className="text-[10px] text-emerald-400 font-extrabold ml-1.5">(Save up to 46%)</span>
          </button>
        </div>
      </div>

      {/* PRICING CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {plans.map((p) => (
          <div
            key={p.id}
            className={`glass-panel p-8 glass-panel-hover flex flex-col justify-between relative rounded-3xl transition-all duration-300 ${
              p.popular 
                ? 'border-cyan-400/60 shadow-2xl shadow-cyan-500/20 scale-103 bg-cyan-500/[0.03]' 
                : 'border-white/10'
            }`}
          >
            {p.popular && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-black text-[10px] font-black uppercase tracking-widest shadow-md">
                RECOMMENDED BY PRACTICES
              </div>
            )}

            <div>
              {/* Badge for Seat Count */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-cyan-300 text-[11px] font-mono mb-3">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>{p.seatsBadge}</span>
              </div>

              <h3 className="text-2xl font-black text-white font-outfit">{p.name}</h3>
              <p className="text-xs text-gray-400 mt-1 min-h-[32px]">{p.desc}</p>

              {/* Pricing Display */}
              <div className="mt-6 flex flex-col">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-black text-white font-outfit tracking-tight">{p.price}</span>
                  {p.period && <span className="text-xs font-semibold text-gray-400">{p.period}</span>}
                </div>
                {p.savings ? (
                  <span className="text-[11px] text-emerald-400 font-bold mt-1">
                    ✓ {p.savings}
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-500 mt-1">
                    Billed every 30 days &bull; Card Autopay supported
                  </span>
                )}
              </div>

              {/* Feature List */}
              <div className="mt-8 flex flex-col gap-3">
                {p.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span className="leading-snug">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-8 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => handleAction(p)}
                className={`w-full py-3.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  p.isContact
                    ? 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
                    : p.popular
                      ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:to-blue-400 text-black shadow-lg shadow-cyan-500/25 active:scale-98'
                      : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 active:scale-98'
                }`}
              >
                {p.isContact ? (
                  <>
                    <MessageSquare className="w-4 h-4 text-cyan-300" />
                    <span>{p.btnText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>{p.btnText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              
              {!p.isContact && (
                <div className="text-[10px] text-gray-500 text-center font-mono mt-2">
                  Direct Card &bull; Instant UPI &bull; Bank Transfer
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Enterprise Contact & Inquiry Footer */}
      <div className="mt-16 p-8 rounded-3xl glass-panel border border-cyan-500/20 text-center max-w-3xl mx-auto flex flex-col items-center justify-center relative overflow-hidden">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-lg shadow-cyan-500/20">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-white font-outfit">Need a custom plan for 50+ members?</h3>
        <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
          Send an inquiry message to our enterprise team for bespoke practice integrations, custom seat quotas, and volume discounts.
        </p>

        <button
          type="button"
          onClick={() => {
            if (onSelectTab) onSelectTab('contact');
          }}
          className="mt-5 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>Send Inquiry Message</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
