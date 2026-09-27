import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { logAuditActivity } from '../../lib/auditLogger';
import { formatDate } from '../../lib/dateUtils';
import { 
  Clock, Calendar, ShieldCheck, CheckCircle2, CloudLightning, ArrowRight, 
  Activity, Plus, Key, CreditCard, Download, Zap, RefreshCw, AlertCircle, 
  Sparkles, Gift, Check, ExternalLink, HelpCircle, ChevronRight, Sliders, 
  History, FileText, DollarSign, X, Trophy, AlertTriangle, Play, ChevronDown, 
  CheckCircle, Info, Lock, Eye, EyeOff, BarChart3, Radio, Receipt,
  Copy, Building, User, LogIn, CheckSquare, QrCode, ArrowUpRight
} from 'lucide-react';

// Verified Owner Bank Account Details for Direct Settlement
export const OWNER_BANK_CONFIG = {
  accountName: 'TaxPro Enterprise Solutions (Krushil Gadhiya)',
  bankName: 'The Varachha Co-operative Bank Ltd.',
  accountNumber: '00110121914054',
  ifsc: 'VARA0289001',
  accountType: 'Savings Bank Account',
  branch: 'Varachha Bank, Surat, Gujarat',
  upiId: '9327397851@upi'
};

// Load Razorpay official checkout SDK
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// Web Audio API chime for celebratory moments
const playCelebrationChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.12 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.45);
    });
  } catch (e) {}
};

// Helper to get or initialize exact subscription expiration date (for automatic daily reduction)
const getStoredExpiryDate = (defaultDays = 30) => {
  let saved = localStorage.getItem('taxpro_subscription_expiry_date');
  if (!saved) {
    const d = new Date();
    // Check if there was an existing days count
    const existingDays = parseInt(localStorage.getItem('taxpro_subscription_days') || '30', 10) || defaultDays || 30;
    d.setDate(d.getDate() + existingDays);
    saved = d.toISOString();
    localStorage.setItem('taxpro_subscription_expiry_date', saved);
  }
  return new Date(saved);
};

export default function OwnerPaymentsView({ onShowToast }) {
  const activeCurrency = { symbol: '₹', code: 'INR' };
  
  // Clean Segmented Tabs Navigation
  // 'plans' = Renew & Extend License
  // 'engine' = Daily Decrement Engine & Telemetry
  // 'invoices' = Official Tax Receipts & Invoices
  // 'gateway' = Razorpay Gateway Configuration
  const [activeTab, setActiveTab] = useState('plans');

  // Persisted Plan & Remaining Days (Synchronized with exact expiry date for live daily decrement)
  const [expiryDate, setExpiryDate] = useState(() => getStoredExpiryDate(30));
  const [remainingDays, setRemainingDays] = useState(() => {
    const target = getStoredExpiryDate(30);
    const diffMs = target.getTime() - Date.now();
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    localStorage.setItem('taxpro_subscription_days', String(days));
    return days;
  });

  // Real-time ticking digital clock countdown (Days, Hours, Minutes, Seconds)
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const [activePlan, setActivePlan] = useState(() => {
    return localStorage.getItem('taxpro_subscription_plan') || 'Fintech Enterprise';
  });

  // Track completed customer payment count (for surprise 10th customer milestone)
  const [completedPaymentsCount, setCompletedPaymentsCount] = useState(() => {
    const saved = localStorage.getItem('taxpro_owner_payment_count');
    return saved ? parseInt(saved, 10) : 9; // Default at 9 so next test payment triggers the 10th milestone!
  });

  const [history, setHistory] = useState([]);

  // Modal for subscription upgrade / payment checkout
  const [selectedSubPlan, setSelectedSubPlan] = useState(null);
  const [isProcessingSub, setIsProcessingSub] = useState(false);
  const [processingStep, setProcessingStep] = useState('');

  // Live Razorpay API Keys Configuration State
  const [razorpayConfig, setRazorpayConfig] = useState({ isConfigured: false, keyId: '', rawKeyId: '', mode: 'Live Mode' });
  const [isKeysModalOpen, setIsKeysModalOpen] = useState(false);
  const [keyInput, setKeyInput] = useState({ keyId: '', keySecret: '' });
  const [showKeySecret, setShowKeySecret] = useState(false);
  const [isSavingKeys, setIsSavingKeys] = useState(false);
  const [keySaveError, setKeySaveError] = useState('');
  const [keySaveSuccess, setKeySaveSuccess] = useState('');

  // 10th Customer Milestone Gift Modal & Animation States (Kept as a genuine surprise)
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [isGiftOpened, setIsGiftOpened] = useState(false);
  const [giftRewardDetails, setGiftRewardDetails] = useState(null);

  // Search & Filter state for receipts
  const [receiptSearchTerm, setReceiptSearchTerm] = useState('');

  // Dedicated Card Payment Interface State (Right Side & Direct Bank Settlement)
  const [selectedCardPlan, setSelectedCardPlan] = useState(null);
  const [cardholderName, setCardholderName] = useState(() => {
    return (localStorage.getItem('taxpro_user_fullname') || 'KRUSHIL GADHIYA').toUpperCase();
  });
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [enableAutopay, setEnableAutopay] = useState(true);
  const [isProcessingCard, setIsProcessingCard] = useState(false);
  const [cardPaymentSuccess, setCardPaymentSuccess] = useState(null);
  const [copiedBankField, setCopiedBankField] = useState(null);
  const [paymentChoiceModalPlan, setPaymentChoiceModalPlan] = useState(null);

  // Live real-time clock ticking: automatically evaluates and reduces days every day
  useEffect(() => {
    const tick = () => {
      const saved = localStorage.getItem('taxpro_subscription_expiry_date');
      const target = saved ? new Date(saved) : getStoredExpiryDate(30);
      const now = new Date();
      const diffMs = target.getTime() - now.getTime();

      if (diffMs <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (remainingDays !== 0) {
          setRemainingDays(0);
          localStorage.setItem('taxpro_subscription_days', '0');
        }
      } else {
        const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const h = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diffMs % (1000 * 60)) / 1000);
        setCountdown({ days: d, hours: h, minutes: m, seconds: s });

        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (daysLeft !== remainingDays) {
          setRemainingDays(daysLeft);
          localStorage.setItem('taxpro_subscription_days', String(daysLeft));
        }
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [remainingDays]);

  // Fetch Razorpay live key status from backend
  const fetchRazorpayConfig = async () => {
    try {
      const res = await fetch('/api/payments/razorpay/config');
      if (res.ok) {
        const data = await res.json();
        setRazorpayConfig(data);
        if (data.rawKeyId && !keyInput.keyId) {
          setKeyInput(prev => ({ ...prev, keyId: data.rawKeyId }));
        }
      }
    } catch (e) {
      console.warn('[Razorpay Config Check Error]:', e);
    }
  };

  const formatCurrency = (val, dec = 0) => {
    const n = parseFloat(val) || 0;
    return `${activeCurrency?.symbol || '₹'}${n.toLocaleString('en-IN', {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec
    })}`;
  };

  // Fetch Billing History
  const fetchBillingHistory = async () => {
    try {
      const payRes = await supabase.from('payments').select('*').order('created_at', { ascending: false });

      const allPayments = payRes.data || [];
      if (allPayments.length > 0) {
        const subPayments = allPayments.filter(p => 
          (p.category && (p.category.toLowerCase().includes('subscription') || p.category.toLowerCase().includes('plan'))) ||
          (p.recipient && p.recipient.toLowerCase().includes('taxpro'))
        );

        const listToDisplay = subPayments.length > 0 ? subPayments : allPayments;
        setHistory(listToDisplay.map((p, idx) => ({
          id: p.id || `INV-0${idx + 100}`,
          date: formatDate(p.created_at || p.date || Date.now()),
          amount: formatCurrency(p.numeric_amount || p.amount || 0),
          plan: p.category || 'Platform Subscription',
          status: p.status || 'Paid',
          method: p.method || 'Razorpay',
          reference: p.payment_id || p.reference || p.id,
          receiptNumber: p.receipt_number || `REC-RZP-${p.id ? p.id.slice(-8) : idx + 100}`
        })));
      }
    } catch (e) {
      console.error('[Owner Billing Fetch Error]:', e);
    }
  };

  useEffect(() => {
    fetchBillingHistory();
    fetchRazorpayConfig();
    loadRazorpayScript();
    window.addEventListener('taxpro_financial_updated', fetchBillingHistory);
    window.addEventListener('taxpro_db_updated', fetchBillingHistory);
    return () => {
      window.removeEventListener('taxpro_financial_updated', fetchBillingHistory);
      window.removeEventListener('taxpro_db_updated', fetchBillingHistory);
    };
  }, []);

  // Renewal & Extension Plans
  const plans = [
    {
      id: 'startup',
      name: 'Startup Core',
      tierBadge: 'Starter Practice',
      desc: 'Ideal for independent tax advocates & boutique chartered accountants',
      price: `${formatCurrency(999, 0)} / 30 Days`,
      rawPrice: 999,
      daysToAdd: 30,
      features: [
        'Up to 25 Active Client Files & Ledgers',
        'Automated Monthly Retainer Invoices',
        'Direct Bank Payout Reconciliation',
        'Official Tax Invoices via Razorpay',
        'Standard Email & Ticket Support'
      ],
      popular: false,
    },
    {
      id: 'enterprise',
      name: 'Fintech Enterprise',
      tierBadge: 'Most Popular / Recommended',
      desc: 'Complete power suite for rapidly growing CA firms & multi-partner offices',
      price: `${formatCurrency(1999, 0)} / 30 Days`,
      rawPrice: 1999,
      daysToAdd: 30,
      features: [
        'Unlimited Active Client Profiles & Ledgers',
        'Full AI Document & OCR Compliance Engine',
        'Razorpay Multi-Rail Gateway (UPI, Cards, NetBanking)',
        'Real-time IN/OUT Cash Flow & Daily Ledger',
        'Automated 5-Day Due Reminder Emails to Clients',
        'Priority 24/7 SLA Technical Architecture'
      ],
      popular: true,
    },
    {
      id: 'custom',
      name: 'Custom Banking (Annual)',
      tierBadge: '1-Year Annual Pass (Save 30%)',
      desc: 'Dedicated enterprise infrastructure with full year uninterrupted validity',
      price: `${formatCurrency(4999, 0)} / Year`,
      rawPrice: 4999,
      daysToAdd: 365,
      features: [
        'Multi-Entity Consolidated Ledger System',
        'Razorpay Dedicated Partner Payout Architecture',
        'Full +365 Calendar Days Added to Expiry',
        'Bespoke Neural AI Fine-tuning on Local Files',
        'Custom Domain & Dedicated Database Host',
        'SLA 99.999% High-Availability Uptime'
      ],
      popular: false,
    }
  ];

  const activeCardPlan = selectedCardPlan || plans[1] || plans[0];

  const handleCardNumberChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 16);
    const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    if (val.length >= 3) {
      val = val.slice(0, 2) + '/' + val.slice(2);
    }
    setCardExpiry(val);
  };

  const handleCvcChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setCardCvc(val);
  };

  const getCardNetwork = () => {
    const clean = cardNumber.replace(/\s/g, '');
    if (clean.startsWith('4')) return 'VISA';
    if (clean.startsWith('5') || clean.startsWith('2')) return 'MASTERCARD';
    if (clean.startsWith('6') || clean.startsWith('508')) return 'RUPAY';
    if (clean.startsWith('34') || clean.startsWith('37')) return 'AMEX';
    return 'VISA';
  };

  const handleCopyBank = (text, fieldName) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedBankField(fieldName);
      if (onShowToast) onShowToast(`✓ Copied ${fieldName}: ${text}`, 'info');
      setTimeout(() => setCopiedBankField(null), 2500);
    }
  };

  const handleSelectCardPlan = (plan) => {
    setSelectedCardPlan(plan);
    const el = document.getElementById('card-payment-interface');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      el.classList.add('ring-4', 'ring-cyan-500/50');
      setTimeout(() => el.classList.remove('ring-4', 'ring-cyan-500/50'), 1800);
    }
    if (onShowToast) {
      onShowToast(`✓ Selected ${plan.name} for Card Payment to Varachha Bank`, 'info');
    }
  };

  // Real-Time Card Payment Processing with Direct Varachha Bank Credit & Instant Plan Grant
  const handleProcessCardPayment = async (e) => {
    if (e) e.preventDefault();
    const plan = activeCardPlan;
    const rawAmt = plan.rawPrice || 1999;
    
    // Validation
    const cleanNum = cardNumber.replace(/\s/g, '');
    if (cleanNum.length < 12) {
      if (onShowToast) onShowToast('Please enter a valid 16-digit card number', 'warning');
      return;
    }
    if (!cardExpiry || cardExpiry.length < 5) {
      if (onShowToast) onShowToast('Please enter card expiry date (MM/YY)', 'warning');
      return;
    }
    if (!cardCvc || cardCvc.length < 3) {
      if (onShowToast) onShowToast('Please enter 3-digit security code (CVC)', 'warning');
      return;
    }

    setIsProcessingCard(true);

    try {
      const txId = `PAY-CARD-${Date.now()}`;
      const receiptNumber = `REC-CARD-${Date.now().toString().slice(-8)}`;
      const nowIso = new Date().toISOString();
      const todayDate = nowIso.slice(0, 10);
      const userEmail = localStorage.getItem('taxpro_user_email') || 'krushilgadhiya138@gmail.com';
      const userName = cardholderName || localStorage.getItem('taxpro_user_fullname') || 'TaxPro Owner';

      // 1. Calculate 10th Customer Milestone & Bonus Days
      const currentPaymentNum = completedPaymentsCount + 1;
      setCompletedPaymentsCount(currentPaymentNum);
      localStorage.setItem('taxpro_owner_payment_count', String(currentPaymentNum));

      const isTenthCustomer = (currentPaymentNum % 10 === 0);
      const bonusDays = isTenthCustomer ? 1 : 0;
      const effectiveAddedDays = plan.daysToAdd + bonusDays;

      // Add days accurately to expiration timestamp
      const currentExpiry = getStoredExpiryDate(remainingDays);
      const baseTime = currentExpiry.getTime() > Date.now() ? currentExpiry.getTime() : Date.now();
      const newExpiryObj = new Date(baseTime + effectiveAddedDays * 24 * 60 * 60 * 1000);
      localStorage.setItem('taxpro_subscription_expiry_date', newExpiryObj.toISOString());
      setExpiryDate(newExpiryObj);

      const prevDays = remainingDays;
      const newTotalDays = prevDays + effectiveAddedDays;
      const expiryDateStr = newExpiryObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

      // 2. Real-Time LocalStorage & State Activation (INSTANT PLAN GRANT)
      localStorage.setItem('taxpro_subscription_days', String(newTotalDays));
      localStorage.setItem('taxpro_subscription_plan', plan.name);
      localStorage.setItem('taxpro_subscription_status', 'Active');
      setActivePlan(plan.name);
      setRemainingDays(newTotalDays);

      // Local receipts & calendar sync
      try {
        const rawRec = localStorage.getItem('taxpro_receipts_payments');
        const recList = rawRec ? JSON.parse(rawRec) : [];
        const newRec = {
          id: receiptNumber,
          title: `Owner Subscription Payment - ${plan.name}`,
          type: 'expense',
          category: 'Software Licenses & Cloud (AWS/SaaS)',
          amount: rawAmt,
          method: 'Credit / Debit Card (Direct Bank)',
          party: 'The Varachha Co-operative Bank Ltd. (Krushil Gadhiya)',
          date: todayDate,
          reference: txId,
          notes: `Workspace subscription: ${plan.name} (+${effectiveAddedDays} days) | Direct Credit: A/C 00110121914054 | Ref: ${txId}`,
          created_at: nowIso
        };
        localStorage.setItem('taxpro_receipts_payments', JSON.stringify([newRec, ...recList.filter(r => r.id !== newRec.id)]));

        const rawCal = localStorage.getItem('taxpro_calendar_transactions');
        const calList = rawCal ? JSON.parse(rawCal) : [];
        const calTx = {
          id: receiptNumber,
          type: 'Expense',
          party: 'The Varachha Co-operative Bank Ltd. (Krushil Gadhiya)',
          category: 'Software Licenses & Cloud (AWS/SaaS)',
          amount: rawAmt,
          mode: 'Credit / Debit Card',
          date: todayDate,
          notes: `Workspace subscription: ${plan.name} (+${effectiveAddedDays} days) | Credit: 00110121914054`
        };
        localStorage.setItem('taxpro_calendar_transactions', JSON.stringify([calTx, ...calList.filter(c => c.id !== receiptNumber)]));
      } catch (e) {}

      // 3. PostgreSQL Database Recording via /api/payments/record-direct
      try {
        await fetch('/api/payments/record-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            txId,
            amount: rawAmt,
            planName: plan.name,
            billingCycle: plan.daysToAdd >= 365 ? '1 Year Annual License' : '30 Days Subscription',
            seats: 'Full Enterprise Suite',
            method: 'Credit / Debit Card (Direct Bank)',
            email: userEmail,
            userName: userName,
            autopay: enableAutopay,
            reference: `Card ending in ${cardNumber.slice(-4) || '4242'} | Direct Settlement to 00110121914054`,
            receiptNumber,
            prevDays,
            addedDays: effectiveAddedDays,
            totalDays: newTotalDays,
            bonusDays,
            expiryDate: expiryDateStr,
            beneficiaryBank: `${OWNER_BANK_CONFIG.bankName} (A/C: ${OWNER_BANK_CONFIG.accountNumber}, IFSC: ${OWNER_BANK_CONFIG.ifsc})`
          })
        });
      } catch (apiErr) {
        console.warn('[Direct Card API Record Notice]:', apiErr);
      }

      // Also direct Supabase sync if available
      try {
        await supabase.from('receipts_payments').insert([{
          id: receiptNumber,
          title: `Owner Subscription Payment - ${plan.name}`,
          type: 'expense',
          category: 'Software Licenses & Cloud (AWS/SaaS)',
          amount: rawAmt,
          method: 'Credit / Debit Card (Direct Bank)',
          party: 'The Varachha Co-operative Bank Ltd. (Krushil Gadhiya)',
          date: todayDate,
          reference: txId,
          notes: `Workspace subscription: ${plan.name} (+${effectiveAddedDays} days) | Direct Credit to A/C: 00110121914054`,
          created_at: nowIso
        }]);

        await supabase.from('payments').insert([{
          id: txId,
          recipient: 'The Varachha Co-operative Bank Ltd. (Krushil Gadhiya)',
          amount: rawAmt,
          numeric_amount: rawAmt,
          category: 'Software Licenses & Cloud (AWS/SaaS)',
          method: 'Credit / Debit Card',
          status: 'Success',
          payment_id: txId,
          order_id: `DIR-${Date.now()}`,
          date: todayDate,
          reference: receiptNumber,
          notes: `Direct Bank Settlement to A/C: 00110121914054 | ${plan.name} (+${effectiveAddedDays} days)`,
          created_at: nowIso
        }]);
      } catch (sbErr) {}

      // 4. Fire Global Updates & Audio/Visual Feedback
      window.dispatchEvent(new CustomEvent('taxpro_financial_updated'));
      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
      window.dispatchEvent(new CustomEvent('taxpro_subscription_updated'));

      logAuditActivity({
        action: 'SUBSCRIPTION_UPGRADE',
        module: 'Owner Payments',
        details: `Subscribed to ${plan.name} for ${formatCurrency(rawAmt, 0)} via Card (Direct Varachha Bank Credit). Formula: ${prevDays} + ${effectiveAddedDays} = ${newTotalDays} days`,
        metadata: { plan: plan.name, amount: rawAmt, days: effectiveAddedDays, bonusDays, gateway: 'CreditCard-VarachhaBank', receiptNumber, txId }
      });

      playCelebrationChime();

      if (window.confetti) {
        try {
          window.confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
        } catch (e) {}
      }

      setCardPaymentSuccess({
        planName: plan.name,
        amount: rawAmt,
        txId,
        receiptNumber,
        prevDays,
        addedDays: effectiveAddedDays,
        totalDays: newTotalDays,
        expiryDate: expiryDateStr,
        accountCredited: OWNER_BANK_CONFIG.accountNumber,
        bankName: OWNER_BANK_CONFIG.bankName
      });

      if (isTenthCustomer) {
        setGiftRewardDetails({
          customerNumber: currentPaymentNum,
          planName: plan.name,
          prevDays: prevDays,
          planDays: plan.daysToAdd,
          bonusDays: 1,
          totalDays: newTotalDays,
          receiptNumber: receiptNumber
        });
        setIsGiftOpened(false);
        setIsGiftModalOpen(true);
      } else {
        if (onShowToast) {
          onShowToast(`✓ Card Payment of ₹${rawAmt.toLocaleString('en-IN')} Received! ${plan.name} (+${effectiveAddedDays} Days) instantly activated! Credited to Varachha Bank.`, 'success');
        }
      }

      fetchBillingHistory();

    } catch (err) {
      console.error('[Card Payment Error]:', err);
      if (onShowToast) onShowToast(`Payment error: ${err.message}`, 'error');
    } finally {
      setIsProcessingCard(false);
    }
  };

  // Save & Verify Razorpay Live Credentials
  const handleSaveRazorpayKeys = async (e) => {
    if (e) e.preventDefault();
    setIsSavingKeys(true);
    setKeySaveError('');
    setKeySaveSuccess('');

    try {
      const res = await fetch('/api/payments/razorpay/save-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key_id: keyInput.keyId,
          key_secret: keyInput.keySecret
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to verify Razorpay keys.');
      }

      setKeySaveSuccess(data.message || '✓ Keys verified and connected successfully!');
      setRazorpayConfig({
        isConfigured: true,
        keyId: data.keyId,
        rawKeyId: data.rawKeyId,
        mode: data.mode
      });

      if (onShowToast) {
        onShowToast('✓ Razorpay API keys verified! Official checkout is now live.', 'success');
      }

      setTimeout(() => {
        setIsKeysModalOpen(false);
        setKeySaveSuccess('');
        if (selectedSubPlan) {
          startOfficialRazorpayCheckout(selectedSubPlan);
        }
      }, 1200);

    } catch (err) {
      setKeySaveError(err.message || 'Key verification failed');
    } finally {
      setIsSavingKeys(false);
    }
  };

  // Open Razorpay Checkout or Prompt Keys Modal
  const handleUpgrade = (plan) => {
    setSelectedSubPlan(plan);
    if (!razorpayConfig.isConfigured) {
      setIsKeysModalOpen(true);
      if (onShowToast) {
        onShowToast('Please connect your Razorpay Key ID and Secret to open official checkout.', 'info');
      }
    } else {
      startOfficialRazorpayCheckout(plan);
    }
  };

  // Finalize & Record Razorpay Payment with Dual Emails & Milestone Check
  const finalizeRazorpaySubscription = async (plan, paymentId, orderId, signature = '') => {
    const rawAmt = plan.rawPrice || parseInt(String(plan.price).replace(/[^0-9]/g, '')) || 0;
    const methodUsed = 'Razorpay';
    const confId = paymentId || `PAY-RZP-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const todayDate = nowIso.slice(0, 10);
    const userEmail = localStorage.getItem('taxpro_user_email') || 'krushilgadhiya138@gmail.com';
    const userName = localStorage.getItem('taxpro_user_fullname') || 'TaxPro Owner';

    // 1. Calculate 10th Customer Milestone & Bonus Days
    const currentPaymentNum = completedPaymentsCount + 1;
    setCompletedPaymentsCount(currentPaymentNum);
    localStorage.setItem('taxpro_owner_payment_count', String(currentPaymentNum));

    // Milestone rule: Every 10th customer payment receives +1 extra bonus day!
    const isTenthCustomer = (currentPaymentNum % 10 === 0);
    const bonusDays = isTenthCustomer ? 1 : 0;
    const effectiveAddedDays = plan.daysToAdd + bonusDays;
    
    // Add days accurately to expiration timestamp
    const currentExpiry = getStoredExpiryDate(remainingDays);
    const baseTime = currentExpiry.getTime() > Date.now() ? currentExpiry.getTime() : Date.now();
    const newExpiryObj = new Date(baseTime + effectiveAddedDays * 24 * 60 * 60 * 1000);
    localStorage.setItem('taxpro_subscription_expiry_date', newExpiryObj.toISOString());
    setExpiryDate(newExpiryObj);

    const prevDays = remainingDays;
    const newTotalDays = prevDays + effectiveAddedDays;
    const receiptNumber = `REC-RZP-${Date.now().toString().slice(-8)}`;
    const expiryDateStr = newExpiryObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // 2. Call Backend Razorpay Verify API (Which automatically sends BOTH Receipt & Validity Emails)
    try {
      await fetch('/api/payments/razorpay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: confId,
          razorpay_signature: signature,
          amount: `₹${rawAmt.toLocaleString('en-IN')}`,
          description: plan.name,
          planName: plan.name,
          email: userEmail,
          clientName: userName,
          receiptNumber: receiptNumber,
          prevDays: prevDays,
          addedDays: effectiveAddedDays,
          totalDays: newTotalDays,
          bonusDays: bonusDays,
          expiryDate: expiryDateStr
        })
      });
    } catch (e) {
      console.warn('[Backend Verify & Email Fallback]:', e);
    }

    // 3. Direct Sync to Supabase PostgreSQL Tables
    try {
      await supabase.from('receipts_payments').insert([{
        id: receiptNumber,
        title: `Owner Subscription Payment - ${plan.name}`,
        type: 'expense',
        category: 'Software Licenses & Cloud (AWS/SaaS)',
        amount: rawAmt,
        method: methodUsed,
        party: 'TaxPro Platform Subscription (Owner)',
        date: todayDate,
        reference: confId,
        notes: `Workspace subscription: ${plan.name} (+${effectiveAddedDays} days) | Order: ${orderId} | Ref: ${confId}`,
        created_at: nowIso
      }]);

      await supabase.from('payments').insert([{
        id: confId,
        recipient: 'TaxPro Platform Subscription (Owner)',
        amount: rawAmt,
        numeric_amount: rawAmt,
        category: `Software Licenses & Cloud (AWS/SaaS)`,
        method: methodUsed,
        status: 'Success',
        payment_id: confId,
        order_id: orderId,
        date: todayDate,
        reference: receiptNumber,
        notes: `Workspace subscription: ${plan.name} (+${effectiveAddedDays} days)`,
        created_at: nowIso
      }]);
    } catch (e) {
      console.warn('DB recording fallback:', e);
    }

    // 4. Update Remaining Days + Added Days = Total Days in LocalStorage & State
    try {
      const rawRec = localStorage.getItem('taxpro_receipts_payments');
      const recList = rawRec ? JSON.parse(rawRec) : [];
      const newRec = {
        id: receiptNumber,
        title: `Owner Subscription Payment - ${plan.name}`,
        type: 'expense',
        category: 'Software Licenses & Cloud (AWS/SaaS)',
        amount: rawAmt,
        method: methodUsed,
        party: 'TaxPro Platform Subscription (Owner)',
        date: todayDate,
        reference: confId,
        notes: `Workspace subscription: ${plan.name} (+${effectiveAddedDays} days) | Ref: ${confId}`,
        created_at: nowIso
      };
      localStorage.setItem('taxpro_receipts_payments', JSON.stringify([newRec, ...recList.filter(r => r.id !== newRec.id)]));

      const rawCal = localStorage.getItem('taxpro_calendar_transactions');
      const calList = rawCal ? JSON.parse(rawCal) : [];
      const calTx = {
        id: receiptNumber,
        type: 'Expense',
        party: 'TaxPro Platform Subscription (Owner)',
        category: 'Software Licenses & Cloud (AWS/SaaS)',
        amount: rawAmt,
        mode: methodUsed,
        date: todayDate,
        notes: `Workspace subscription: ${plan.name} (+${effectiveAddedDays} days)`
      };
      localStorage.setItem('taxpro_calendar_transactions', JSON.stringify([calTx, ...calList.filter(c => c.id !== receiptNumber)]));
      
      localStorage.setItem('taxpro_subscription_days', String(newTotalDays));
      localStorage.setItem('taxpro_subscription_plan', plan.name);
      localStorage.setItem('taxpro_subscription_status', 'Active');
      setActivePlan(plan.name);
      setRemainingDays(newTotalDays);
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('taxpro_financial_updated'));
    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

    logAuditActivity({
      action: 'SUBSCRIPTION_UPGRADE',
      module: 'Owner Payments',
      details: `Subscribed to ${plan.name} for ${formatCurrency(rawAmt, 0)} via Razorpay Gateway (+${effectiveAddedDays} days). Formula: ${prevDays} + ${effectiveAddedDays} = ${newTotalDays} days`,
      metadata: { plan: plan.name, amount: rawAmt, days: effectiveAddedDays, bonusDays, gateway: 'Razorpay', receiptNumber }
    });

    setIsProcessingSub(false);

    // 5. If 10th Customer, trigger Surprise Milestone Gift Unwrapping Animation Modal!
    if (isTenthCustomer) {
      setGiftRewardDetails({
        customerNumber: currentPaymentNum,
        planName: plan.name,
        prevDays: prevDays,
        planDays: plan.daysToAdd,
        bonusDays: 1,
        totalDays: newTotalDays,
        receiptNumber: receiptNumber
      });
      setIsGiftOpened(false);
      setIsGiftModalOpen(true);
      playCelebrationChime();
    } else {
      if (window.confetti) {
        try { window.confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } }); } catch (e) {}
      }
      if (onShowToast) {
        onShowToast(`✓ Payment verified via Razorpay! Receipt #${receiptNumber} & Validity Email (${prevDays} + ${effectiveAddedDays} = ${newTotalDays} Days) sent!`, 'success');
      }
    }

    setActiveTab('invoices');
    fetchBillingHistory();
  };

  // Handle Payment Failure with Automated Alert Email Dispatch
  const handlePaymentFailure = async (failureReason, orderId, plan, rawAmt, userEmail, userName) => {
    setIsProcessingSub(false);
    setProcessingStep('');
    if (onShowToast) {
      onShowToast(`⚠️ Razorpay Payment Failed: ${failureReason}. Alert email sent.`, 'error');
    }

    try {
      await fetch('/api/payments/send-payment-failed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail || 'krushilgadhiya138@gmail.com',
          name: userName || 'TaxPro Owner',
          planName: plan?.name || 'Platform Subscription',
          amount: `₹${(rawAmt || 1999).toLocaleString('en-IN')}`,
          orderId: orderId || `order_${Date.now()}`,
          failureReason: failureReason || 'Transaction declined by bank'
        })
      });
    } catch (failErr) {
      console.warn('[Failure Email Error]:', failErr);
    }
  };

  // Launch Official Razorpay Checkout Popup with Live Order Creation
  const startOfficialRazorpayCheckout = async (planToUse = null) => {
    const plan = planToUse || selectedSubPlan;
    if (!plan) return;
    setIsProcessingSub(true);
    setProcessingStep('Initializing Razorpay Order...');

    const rawAmt = plan.rawPrice || parseInt(String(plan.price).replace(/[^0-9]/g, '')) || 0;
    const amountInPaise = rawAmt * 100;
    const userEmail = localStorage.getItem('taxpro_user_email') || 'krushilgadhiya138@gmail.com';
    const userName = localStorage.getItem('taxpro_user_fullname') || 'TaxPro Owner';
    const userPhone = localStorage.getItem('taxpro_user_phone') || '9876543210';

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || typeof window === 'undefined' || !window.Razorpay) {
        throw new Error('Razorpay Checkout SDK failed to load. Please check network connection.');
      }

      // 1. Generate live Razorpay Order on server
      const orderRes = await fetch('/api/payments/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          notes: {
            plan: plan.name,
            days: plan.daysToAdd,
            email: userEmail
          }
        })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success || !orderData.order) {
        throw new Error(orderData.error || 'Failed to create Razorpay order.');
      }

      // 2. Launch Official Razorpay Checkout Modal
      const options = {
        key: orderData.key_id,
        amount: orderData.order.amount,
        currency: orderData.order.currency || 'INR',
        name: 'TaxPro Enterprise Platform',
        description: `Subscription: ${plan.name} (+${plan.daysToAdd} Days)`,
        image: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
        order_id: orderData.order.id,
        prefill: {
          name: userName,
          email: userEmail,
          contact: userPhone
        },
        notes: {
          plan_name: plan.name,
          days_to_add: String(plan.daysToAdd)
        },
        theme: {
          color: '#2563eb'
        },
        handler: async function (response) {
          setIsProcessingSub(true);
          setProcessingStep('Payment authorized! Verifying transaction & dispatching emails...');
          await finalizeRazorpaySubscription(
            plan, 
            response.razorpay_payment_id || `pay_${Date.now()}`, 
            response.razorpay_order_id || orderData.order.id,
            response.razorpay_signature
          );
        },
        modal: {
          ondismiss: function () {
            setIsProcessingSub(false);
            setProcessingStep('');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', async function (res) {
        setIsProcessingSub(false);
        setProcessingStep('');
        const failureReason = res.error?.description || 'Transaction cancelled or declined by issuing bank';
        await handlePaymentFailure(failureReason, orderData.order.id, plan, rawAmt, userEmail, userName);
      });

      rzp.open();

    } catch (err) {
      console.error('[Razorpay Checkout Error]:', err);
      if (onShowToast) {
        onShowToast(`⚠️ Razorpay Error: ${err.message}`, 'error');
      }
      setIsProcessingSub(false);
      setProcessingStep('');
    }
  };

  const handleDownloadReceipt = (invoice) => {
    const textData = `
=====================================================
          TAXPRO OFFICIAL PAYMENT RECEIPT
=====================================================
Receipt Number  : ${invoice.receiptNumber || invoice.id}
Transaction ID  : ${invoice.id}
Payment ID      : ${invoice.reference || invoice.id}
Date            : ${invoice.date}
Plan Name       : ${invoice.plan}
Amount Paid     : ${invoice.amount}
Payment Rail    : Razorpay India (Exclusive Verified Rail)
Payment Status  : SUCCESS (Verified & Settled)
Licensee        : TaxPro Managing Partner / Practice Owner
Platform        : TaxPro AI Enterprise Practice Suite
Security        : 256-Bit SSL Encrypted (RBI Compliant)
=====================================================
Thank you for using TaxPro Enterprise!
    `;
    const blob = new Blob([textData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Razorpay_Tax_Invoice_${invoice.receiptNumber || invoice.id}.txt`;
    link.click();
    if (onShowToast) onShowToast(`Tax receipt downloaded for ${invoice.receiptNumber || invoice.id}`, 'success');
  };

  // Trigger gift unwrap animation
  const handleOpenGiftBox = () => {
    setIsGiftOpened(true);
    playCelebrationChime();
    if (window.confetti) {
      try {
        window.confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 } });
        setTimeout(() => {
          window.confetti({ particleCount: 150, spread: 90, origin: { y: 0.4 } });
        }, 300);
      } catch (e) {}
    }
  };

  const filteredHistory = useMemo(() => {
    if (!receiptSearchTerm) return history;
    const term = receiptSearchTerm.toLowerCase();
    return history.filter(h => 
      (h.receiptNumber && h.receiptNumber.toLowerCase().includes(term)) ||
      (h.id && h.id.toLowerCase().includes(term)) ||
      (h.plan && h.plan.toLowerCase().includes(term)) ||
      (h.amount && h.amount.toLowerCase().includes(term)) ||
      (h.date && h.date.toLowerCase().includes(term))
    );
  }, [history, receiptSearchTerm]);

  return (
    <div className="p-3 sm:p-5 lg:p-6 bg-[#f3f4f6] min-h-screen text-slate-800 space-y-4 animate-page-fade font-sans">
      
      {/* 1. CLEAN TOP HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black font-outfit text-slate-900 tracking-tight">
              Workspace License & Validity
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {remainingDays > 0 ? 'Active & Protected' : 'License Expired'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time daily decrementing validity engine, automated Razorpay renewal, and official GST tax receipts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {/* Go to Login Page / Switch Account */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('taxpro_open_login'))}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer shadow-2xs active:scale-95"
            title="Go to Login Page or Switch Account"
          >
            <LogIn className="w-3.5 h-3.5 text-indigo-600" />
            <span>Go to Login Page</span>
          </button>

          {/* Direct Card Payment (Varachha Bank) Shortcut */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('plans');
              setTimeout(() => {
                const el = document.getElementById('card-payment-interface');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  el.classList.add('ring-4', 'ring-cyan-500/50');
                  setTimeout(() => el.classList.remove('ring-4', 'ring-cyan-500/50'), 1800);
                }
              }, 80);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-cyan-300 bg-cyan-50/80 hover:bg-cyan-100 text-cyan-900 transition-all cursor-pointer shadow-2xs active:scale-95"
            title="Jump to Direct Card Payment (The Varachha Co-op Bank Ltd.)"
          >
            <CreditCard className="w-3.5 h-3.5 text-cyan-700" />
            <span>Card Payment (Varachha Bank)</span>
          </button>

          {/* Razorpay Keys Status Badge & Trigger */}
          <button
            type="button"
            onClick={() => setIsKeysModalOpen(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs active:scale-95 ${
              razorpayConfig.isConfigured
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/80'
                : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
            }`}
            title="Configure Razorpay Gateway Keys"
          >
            <Key className="w-3.5 h-3.5 text-blue-600" />
            <span>{razorpayConfig.isConfigured ? `Razorpay Live (${razorpayConfig.keyId})` : 'Connect Razorpay Keys'}</span>
            <span className={`w-2 h-2 rounded-full ${razorpayConfig.isConfigured ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI RIBBON (4 CLEAN WHITE CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Metric 1: Current Plan */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Current Subscription</div>
            <div className="text-lg sm:text-xl font-black font-outfit text-slate-900 mt-1">{activePlan}</div>
            <div className="text-[11px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Full Enterprise Suite
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <CloudLightning className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Remaining Days (The Star Metric) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-blue-200/80 shadow-2xs flex items-center justify-between ring-1 ring-blue-500/10">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 flex items-center gap-1">
              <span>Remaining Validity</span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-outfit text-blue-600 mt-1">
              {remainingDays} <span className="text-sm font-bold text-slate-500">Days</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              Auto-decrements daily
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/20">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Live 24-Hour Day Decrement Clock */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Next Day Deduction In</div>
            <div className="text-base sm:text-lg font-black font-mono text-slate-900 mt-1 tracking-tight">
              {String(countdown.hours).padStart(2, '0')}h : {String(countdown.minutes).padStart(2, '0')}m : {String(countdown.seconds).padStart(2, '0')}s
            </div>
            <div className="text-[11px] text-amber-600 font-bold mt-0.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> Ticking live clock
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4: Expiry Date */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Expiration Date</div>
            <div className="text-sm sm:text-base font-black font-mono text-slate-900 mt-1">
              {expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Adds directly on renewal
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* 3. VALIDITY HEALTH PROGRESS CARD */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Workspace License Health</span>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
              Anchor: {expiryDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <span className="font-mono font-bold text-blue-600">
            {remainingDays > 5 ? `${remainingDays} Days Remaining (Active)` : `${remainingDays} Days (Renew Needed Soon)`}
          </span>
        </div>
        
        {/* Visual Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
          <div 
            className="bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(100, Math.max(8, (remainingDays / 60) * 100))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-2">
          <span>Day 0 (Expired)</span>
          <span className="text-blue-600 font-bold">24-Hour Automatic Decrement Cycle Active</span>
          <span>60+ Days (Extended)</span>
        </div>
      </div>

      {/* 4. MODERN SEGMENTED TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'plans' 
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20' 
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Renew & Extend License</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('engine')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'engine' 
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20' 
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Daily Decrement Engine</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'invoices' 
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20' 
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Razorpay Tax Receipts ({history.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gateway')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'gateway' 
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20' 
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Razorpay Gateway Settings</span>
        </button>
      </div>

      {/* 5. TAB 1: RENEW & EXTEND LICENSE */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* LEFT COLUMN: Renewal & Extension Plans (7 columns) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="space-y-4">
                {plans.map((p) => {
                  const isCurrent = activePlan === p.name;
                  const isCardSelected = activeCardPlan.id === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`bg-white rounded-2xl p-5 sm:p-6 flex flex-col justify-between relative transition-all border ${
                        p.popular
                          ? 'border-blue-500 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20'
                          : isCardSelected
                          ? 'border-cyan-500 shadow-md ring-1 ring-cyan-500/30'
                          : 'border-slate-200/80 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      {p.popular && (
                        <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-md">
                          Firm Recommended
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">
                            {p.tierBadge}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {isCardSelected && (
                              <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 text-[10px] font-bold border border-cyan-200">
                                Active on Card
                              </span>
                            )}
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                Current Plan
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h3 className="text-lg font-black text-slate-900 font-outfit">{p.name}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
                          </div>
                          <div className="text-left sm:text-right shrink-0">
                            <div className="text-xl font-black text-slate-900 font-outfit">{p.price}</div>
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-mono font-bold border border-blue-100">
                              +{p.daysToAdd} Days Validity
                            </span>
                          </div>
                        </div>

                        {/* Dynamic Equation Preview */}
                        <div className="my-3 p-2.5 rounded-xl bg-blue-50/60 border border-blue-100/80 text-[11px] font-mono text-blue-900 flex items-center justify-between">
                          <span className="text-slate-600 font-sans font-medium">Real-Time Plan Grant Formula:</span>
                          <span className="font-bold">Current ({remainingDays}d) + Added ({p.daysToAdd}d) = <b className="text-blue-700 font-black">{remainingDays + p.daysToAdd} Total Days</b></span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                          {p.features.map((feat, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                              <span className="leading-snug">{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* TWO DUAL PAYMENT OPTIONS FOR EVERY PLAN */}
                      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2.5">
                        {/* Option 1: Razorpay Gateway */}
                        <button
                          type="button"
                          onClick={() => handleUpgrade(p)}
                          className="w-full sm:w-1/2 py-2.5 px-3 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 shadow-xs shadow-blue-600/20"
                          title="Pay via Official Razorpay Gateway (UPI, Cards, Netbanking)"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span>Pay via Razorpay</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-75" />
                        </button>

                        {/* Option 2: Card Payment Interface (Right Side) */}
                        <button
                          type="button"
                          onClick={() => handleSelectCardPlan(p)}
                          className={`w-full sm:w-1/2 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 border ${
                            isCardSelected
                              ? 'bg-slate-900 text-cyan-300 border-slate-900 shadow-md shadow-slate-900/20'
                              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
                          }`}
                          title="Open Card Interface on Right Side (Direct Varachha Bank Settlement)"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                          <span>Pay with Card (Right Side)</span>
                          <ArrowUpRight className="w-3.5 h-3.5 ml-auto opacity-75" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Feature Banner: Security & Instant Email Dispatches */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">Dual Payment Channels & Instant Plan Activation</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Choose between Razorpay (UPI, Netbanking) or Direct Card Settlement into The Varachha Co-operative Bank Ltd. Both rails grant immediate plan activation and dispatch official tax receipts.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1 rounded-lg bg-slate-50 text-slate-700 text-xs font-mono font-bold border border-slate-200">
                    Live 256-Bit SSL Rail
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Dedicated Real-Time Card Payment Interface (5 columns) */}
            <div 
              id="card-payment-interface"
              className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xl shadow-slate-200/50 space-y-4 transition-all"
            >
              {/* Card Section Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-[1px] shadow-xs">
                    <div className="w-full h-full bg-white rounded-xl flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-cyan-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-black font-outfit text-slate-900 flex items-center gap-1.5">
                      <span>Card Payment Interface</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </h3>
                    <p className="text-[11px] text-slate-500">Direct Varachha Bank settlement in real-time</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 text-[10px] font-mono font-bold border border-cyan-200">
                    Direct Rail
                  </span>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('taxpro_open_login'))}
                    className="block text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer mt-0.5"
                    title="Sign in with different credentials"
                  >
                    Login Page →
                  </button>
                </div>
              </div>

              {/* Active Plan Selector Chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span>Selected Plan for Card Payment:</span>
                  <span className="text-blue-600 font-mono font-black">{activeCardPlan.price}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
                  {plans.map((pl) => {
                    const isSelected = activeCardPlan.id === pl.id;
                    return (
                      <button
                        key={pl.id}
                        type="button"
                        onClick={() => setSelectedCardPlan(pl)}
                        className={`py-1.5 px-2 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer truncate text-center ${
                          isSelected 
                            ? 'bg-white text-blue-700 shadow-xs border border-blue-200/80 font-black' 
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {pl.name.split(' ')[0]} ({formatCurrency(pl.rawPrice, 0)})
                      </button>
                    );
                  })}
                </div>

                {/* Live Validity Calculation Equation for Selected Plan */}
                <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between text-[11px] font-mono text-blue-900">
                  <span className="text-slate-500">Validity Equation:</span>
                  <span className="font-bold">{remainingDays}d + {activeCardPlan.daysToAdd}d = <b className="text-blue-700 font-black">{remainingDays + activeCardPlan.daysToAdd} Total Days</b></span>
                </div>
              </div>

              {/* 3D Metallic Card Visualizer Container */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-100 to-slate-200/70 border border-slate-300/80 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                <div className="card-3d-perspective w-full max-w-[340px]">
                  <div 
                    className={`card-3d-inner ${isCardFlipped ? 'is-flipped' : ''}`}
                    style={{ height: '200px' }}
                  >
                    {/* FRONT OF CARD (Sable Metallic Style) */}
                    <div className="card-3d-face card-3d-front card-3d-front-sable">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="card-chip-silver" />
                          <svg className="w-5 h-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M8.5 16.5a5 5 0 0 1 0-9" />
                            <path d="M12 19a8.5 8.5 0 0 0 0-14" />
                            <path d="M15.5 21.5a12 12 0 0 0 0-19" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-black font-sans tracking-[1.5px] text-slate-900 block leading-tight">
                            VARACHHA CO-OP BANK
                          </span>
                          <span className="text-[8px] text-slate-600 font-bold tracking-widest uppercase">
                            PLATINUM CARD
                          </span>
                        </div>
                      </div>

                      {/* Card Number Engraved */}
                      <div className="my-auto py-1">
                        <div className="pan-engraved text-base sm:text-lg font-mono tracking-[3px] text-slate-900 truncate">
                          {cardNumber || '4242 •••• •••• 4242'}
                        </div>
                      </div>

                      {/* Bottom Info: Cardholder, Expiry, Brand */}
                      <div className="flex items-end justify-between text-slate-900">
                        <div>
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">
                            CARDHOLDER
                          </span>
                          <span className="font-mono text-xs font-black uppercase tracking-wider block truncate max-w-[150px]">
                            {cardholderName || 'KRUSHIL GADHIYA'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">
                            EXPIRES
                          </span>
                          <span className="font-mono text-xs font-black block">
                            {cardExpiry || '12/28'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-black italic text-base text-slate-900 tracking-wider font-sans">
                            {getCardNetwork()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* BACK OF CARD */}
                    <div className="card-3d-face card-3d-back">
                      <div className="card-mag-stripe" />
                      <div className="my-auto">
                        <div className="px-5 mb-1 text-right">
                          <span className="text-[8px] text-slate-400 uppercase tracking-wider font-mono">SECURITY CODE (CVC)</span>
                        </div>
                        <div className="card-signature-bar">
                          <span className="font-mono font-bold text-sm tracking-widest text-slate-900">
                            {cardCvc || '•••'}
                          </span>
                        </div>
                      </div>
                      <div className="px-5 flex items-center justify-between text-[8px] text-slate-400 font-mono">
                        <div className="card-hologram" />
                        <span className="truncate max-w-[220px]">Direct Credit: A/C 00110121914054 &bull; 256-Bit SSL</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Flip Card Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsCardFlipped(!isCardFlipped)}
                  className="mt-2.5 text-[10px] text-slate-600 hover:text-slate-900 flex items-center gap-1 font-mono font-bold cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{isCardFlipped ? 'Flip to Front View' : 'Flip to Back (View CVC & Strip)'}</span>
                </button>
              </div>

              {/* Card Input Details Form */}
              <form onSubmit={handleProcessCardPayment} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>CARDHOLDER NAME</span>
                    <span className="text-[10px] text-slate-400 font-normal">As on card</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="KRUSHIL GADHIYA"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-cyan-500 focus:bg-white rounded-xl text-xs text-slate-900 font-mono uppercase outline-hidden transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>CARD NUMBER</span>
                    <span className="text-[10px] font-mono text-blue-600 font-bold">{getCardNetwork()}</span>
                  </label>
                  <div className="relative">
                    <CreditCard className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-cyan-500 focus:bg-white rounded-xl text-xs text-slate-900 font-mono tracking-wider outline-hidden transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">EXPIRES (MM/YY)</label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="12/28"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-cyan-500 focus:bg-white rounded-xl text-xs text-slate-900 font-mono outline-hidden transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">SECURITY (CVC)</label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        required
                        maxLength={4}
                        placeholder="•••"
                        value={cardCvc}
                        onChange={handleCvcChange}
                        onFocus={() => setIsCardFlipped(true)}
                        onBlur={() => setIsCardFlipped(false)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-cyan-500 focus:bg-white rounded-xl text-xs text-slate-900 font-mono outline-hidden transition-all"
                      />
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={enableAutopay}
                    onChange={(e) => setEnableAutopay(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-600 font-medium">Enable automatic renewal for uninterrupted validity</span>
                </label>

                {/* OWNER'S EXACT BANK ACCOUNT DETAILS BOX (Direct Settlement Assurance) */}
                <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2 border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <div className="text-[11px] font-bold text-cyan-300 font-mono uppercase tracking-wider">
                          {OWNER_BANK_CONFIG.bankName}
                        </div>
                        <div className="text-[10px] text-slate-400">Direct Beneficiary Account</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold border border-emerald-500/30">
                      Verified Settlement
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px] font-mono">
                    <div className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
                      <span className="text-slate-400">Account No:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{OWNER_BANK_CONFIG.accountNumber}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyBank(OWNER_BANK_CONFIG.accountNumber, 'Account Number')}
                          className="p-1 hover:text-cyan-300 text-slate-400 transition-colors cursor-pointer"
                          title="Copy Account Number"
                        >
                          {copiedBankField === 'Account Number' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
                      <span className="text-slate-400">IFSC Code:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-cyan-400">{OWNER_BANK_CONFIG.ifsc}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyBank(OWNER_BANK_CONFIG.ifsc, 'IFSC Code')}
                          className="p-1 hover:text-cyan-300 text-slate-400 transition-colors cursor-pointer"
                          title="Copy IFSC Code"
                        >
                          {copiedBankField === 'IFSC Code' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-300 pt-0.5 px-1">
                      <span className="text-slate-400">Beneficiary:</span>
                      <span className="font-bold truncate max-w-[200px]">{OWNER_BANK_CONFIG.accountName}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-300 px-1">
                      <span className="text-slate-400">UPI ID:</span>
                      <div className="flex items-center gap-1">
                        <span className="text-emerald-400 font-bold">{OWNER_BANK_CONFIG.upiId}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyBank(OWNER_BANK_CONFIG.upiId, 'UPI ID')}
                          className="p-0.5 hover:text-cyan-300 text-slate-400 transition-colors cursor-pointer"
                          title="Copy UPI ID"
                        >
                          {copiedBankField === 'UPI ID' ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 leading-tight">
                    ✓ Guaranteed Real-Time Settlement: All payments made with this card interface credit directly to Krushil Gadhiya's Varachha Bank account.
                  </div>
                </div>

                {/* Instant Submit Button */}
                <button
                  type="submit"
                  disabled={isProcessingCard}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-blue-600/30 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessingCard ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing Direct Card Transaction...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Pay {formatCurrency(activeCardPlan.rawPrice, 0)} & Instantly Activate Plan</span>
                    </>
                  )}
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* 6. TAB 2: DAILY DECREMENT ENGINE */}
      {activeTab === 'engine' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Column 1: Mathematical Guarantee & Explanation */}
            <div className="lg:col-span-6 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black font-outfit text-slate-900">
                    How Does Daily Day Reduction Work?
                  </h3>
                  <p className="text-xs text-slate-500">Continuous 24-hour mathematical decrement engine</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-600" /> 1. Exact Expiry Timestamp Anchor
                  </div>
                  <p>
                    Your workspace expiration date is stored as an absolute calendar timestamp: <br />
                    <b className="font-mono text-slate-900">{expiryDate.toISOString()}</b>
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-600" /> 2. Real-Time Elapsed Calculation
                  </div>
                  <p>
                    The remaining days formula continuously compares your current time against the expiration timestamp:
                    <br />
                    <code className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-[11px] text-blue-700 inline-block mt-1">
                      Remaining Days = Math.ceil((ExpiryTimestamp - CurrentTime) / 86,400,000 ms)
                    </code>
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-600" /> 3. Automatic Daily Decrement Guarantee
                  </div>
                  <p>
                    Every 24 hours (1 full day) that passes in real life automatically reduces the remaining days by <b>1 day</b>. 
                    Even if you close the browser, turn off your computer, or log in after 5 days, the real calendar calculation instantly reduces the days accordingly upon return!
                  </p>
                </div>
              </div>
            </div>

            {/* Column 2: Live Telemetry Inspector */}
            <div className="lg:col-span-6 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 font-sans">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Live Telemetry Inspector</h3>
                  <p className="text-xs text-slate-500">Real-time synchronization status</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                  ● Clock Synchronized
                </span>
              </div>

              <div className="space-y-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500 font-sans">Current Device Time:</span>
                  <span className="font-bold text-slate-900">{new Date().toLocaleTimeString()}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500 font-sans">Registered Expiry Timestamp:</span>
                  <span className="font-bold text-blue-600">{expiryDate.toLocaleDateString()} {expiryDate.toLocaleTimeString()}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500 font-sans">Live Time Remaining:</span>
                  <span className="font-bold text-slate-900">{countdown.days}d : {countdown.hours}h : {countdown.minutes}m : {countdown.seconds}s</span>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
                  <span className="text-blue-900 font-sans font-bold">Computed Remaining Days:</span>
                  <span className="font-black text-blue-700 text-sm font-outfit">{remainingDays} Days Active</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 7. TAB 3: OFFICIAL TAX RECEIPTS & INVOICES */}
      {activeTab === 'invoices' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Official Razorpay Subscription Invoices</h3>
              <p className="text-xs text-slate-500">Every renewal generates an official tax receipt and delivers dual emails</p>
            </div>
            
            {/* Search filter */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={receiptSearchTerm}
                onChange={(e) => setReceiptSearchTerm(e.target.value)}
                placeholder="Search receipt # or plan..."
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
              <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 shrink-0">
                Razorpay Verified
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Receipt #</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Subscription Plan</th>
                  <th className="p-4">Payment Rail</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400 italic">
                      No subscription invoices found yet. Upgrades and renewals made through Razorpay will automatically appear here.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4 font-mono font-bold text-blue-600">{h.receiptNumber || h.id}</td>
                      <td className="p-4 text-slate-900">{formatDate(h.date)}</td>
                      <td className="p-4 font-semibold text-slate-900">{h.plan}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 w-fit">
                          <CreditCard className="w-3 h-3" /> Razorpay Live
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-slate-900 font-outfit text-sm">{h.amount}</td>
                      <td className="p-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {h.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          type="button"
                          onClick={() => handleDownloadReceipt(h)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ml-auto"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-600" />
                          <span>Tax Invoice</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. TAB 4: RAZORPAY GATEWAY SETTINGS */}
      {activeTab === 'gateway' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Razorpay Payment Rail Status</h3>
                <p className="text-xs text-slate-500">Live API credentials connected to TaxPro Enterprise</p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {razorpayConfig.mode || 'Live Mode'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-sans">Razorpay Key ID:</span>
              <span className="font-bold text-slate-900">{razorpayConfig.keyId || 'rzp_live_T0Kf9EPoYTblhc'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-sans">API Endpoint:</span>
              <span className="font-bold text-blue-600">https://api.razorpay.com/v1</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-sans">Gateway Health:</span>
              <span className="font-bold text-emerald-600">100% Operational (RBI / PCI-DSS Compliant)</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setIsKeysModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-2"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Update Gateway Credentials</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL 1: RAZORPAY KEYS CREDENTIALS MODAL */}
      {isKeysModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsKeysModalOpen(false); }}
          className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden my-auto animate-modal-smooth">
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black font-outfit text-slate-900">Razorpay API Credentials</h3>
                  <p className="text-xs text-slate-500">Live or Test API Key ID and Key Secret</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsKeysModalOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRazorpayKeys} className="p-6 flex flex-col gap-4 text-xs font-semibold overflow-y-auto">
              {keySaveError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{keySaveError}</span>
                </div>
              )}

              {keySaveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{keySaveSuccess}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700">Razorpay Key ID</label>
                <input
                  type="text"
                  required
                  value={keyInput.keyId}
                  onChange={(e) => setKeyInput({ ...keyInput, keyId: e.target.value.trim() })}
                  placeholder="rzp_live_... or rzp_test_..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-mono text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700">Razorpay Key Secret</label>
                <div className="relative">
                  <input
                    type={showKeySecret ? 'text' : 'password'}
                    required
                    value={keyInput.keySecret}
                    onChange={(e) => setKeyInput({ ...keyInput, keySecret: e.target.value.trim() })}
                    placeholder="Enter your Razorpay Key Secret"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-mono text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeySecret(!showKeySecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showKeySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsKeysModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingKeys}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isSavingKeys ? 'Verifying...' : 'Verify & Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: 10TH CUSTOMER MILESTONE SURPRISE GIFT UNWRAPPING ANIMATION */}
      {isGiftModalOpen && giftRewardDetails && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsGiftModalOpen(false); }}
          className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
        >
          <div className="w-full max-w-lg bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 rounded-3xl shadow-2xl border border-amber-500/40 p-6 sm:p-8 text-white relative overflow-hidden my-auto text-center animate-modal-smooth">
            <div className="absolute -top-32 -left-32 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

            <button
              type="button"
              onClick={() => setIsGiftModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer z-20"
            >
              <X className="w-5 h-5" />
            </button>

            {!isGiftOpened ? (
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <span className="px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono text-xs font-black uppercase tracking-widest inline-flex items-center gap-1.5 shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" /> Surprise Milestone Unlocked!
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black font-outfit text-white tracking-tight">
                    You Have A Mystery Gift!
                  </h2>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto">
                    You completed the <b>10th Customer Payment</b>! Tap the golden mystery box below to open your exclusive reward!
                  </p>
                </div>

                {/* Interactive Bouncing 3D Gift Box */}
                <div 
                  onClick={handleOpenGiftBox}
                  className="relative group cursor-pointer my-6 inline-block transform transition-transform hover:scale-105 active:scale-95"
                >
                  <div className="w-36 h-36 sm:w-44 sm:h-44 mx-auto rounded-3xl bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 p-1 shadow-2xl shadow-amber-500/30 flex items-center justify-center relative animate-bounce">
                    <div className="absolute inset-x-0 h-4 bg-red-600 top-1/2 -translate-y-1/2 shadow-xs" />
                    <div className="absolute inset-y-0 w-4 bg-red-600 left-1/2 -translate-x-1/2 shadow-xs" />
                    <div className="w-12 h-12 rounded-full bg-red-600 border-2 border-yellow-200 absolute -top-3 left-1/2 -translate-x-1/2 shadow-md flex items-center justify-center font-black text-white text-xs">
                      🎀
                    </div>
                    <div className="text-5xl sm:text-6xl drop-shadow-md select-none">
                      🎁
                    </div>
                  </div>
                  <div className="mt-3 text-xs font-black text-amber-300 tracking-wider animate-pulse flex items-center justify-center gap-1">
                    <span>✨ CLICK TO UNWRAP GIFT ✨</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleOpenGiftBox}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/30 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Gift className="w-4 h-4" />
                    <span>Unwrap Mystery Gift Now</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 py-2 animate-fade-in">
                <div className="space-y-2">
                  <span className="px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-xs font-black uppercase tracking-widest inline-flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-emerald-400" /> Milestone Reward Claimed
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black font-outfit text-white">
                    🎉 +1 Extra Free Bonus Day!
                  </h2>
                  <p className="text-xs text-slate-300">
                    As a special reward for completing your 10th customer transaction, an <b>extra free day</b> has been added to your validity!
                  </p>
                </div>

                <div className="bg-white/10 rounded-2xl p-4 border border-white/15 text-left space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Previous Remaining Days</span>
                    <span className="font-bold text-white">{giftRewardDetails.prevDays} Days</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Plan Days Purchased</span>
                    <span className="font-bold text-blue-400">+{giftRewardDetails.planDays} Days</span>
                  </div>
                  <div className="flex items-center justify-between text-amber-300 font-bold bg-amber-500/20 p-2 rounded-xl border border-amber-500/30">
                    <span className="flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-amber-400" /> 10th Customer Milestone Bonus
                    </span>
                    <span>+1 EXTRA DAY FREE!</span>
                  </div>
                  <div className="pt-2 border-t border-white/15 flex items-center justify-between text-sm font-black text-emerald-400">
                    <span>New Total Workspace Validity</span>
                    <span>{giftRewardDetails.totalDays} Total Days</span>
                  </div>
                </div>

                <div className="p-3 bg-blue-500/10 border border-blue-400/30 rounded-2xl text-[11px] text-blue-200 text-left flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    Dual confirmation emails (Receipt <b>#{giftRewardDetails.receiptNumber}</b> & Validity Equation) have been delivered to your email.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsGiftModalOpen(false)}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
                >
                  Awesome! Continue to Workspace
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: DIRECT CARD PAYMENT & REAL-TIME PLAN GRANT CONFIRMATION */}
      {cardPaymentSuccess && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setCardPaymentSuccess(null); }}
          className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
        >
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-modal-smooth text-left">
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white text-center relative">
              <button
                type="button"
                onClick={() => setCardPaymentSuccess(null)}
                className="absolute top-4 right-4 p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white flex items-center justify-center mx-auto mb-3 shadow-lg animate-bounce">
                <Check className="w-8 h-8 text-white stroke-[3]" />
              </div>
              <span className="px-3 py-1 rounded-full bg-white/20 text-white font-mono text-[10px] font-black uppercase tracking-widest inline-block mb-1">
                Direct Bank Settlement Verified
              </span>
              <h2 className="text-xl font-black font-outfit text-white">
                Plan Instantly Activated!
              </h2>
              <p className="text-xs text-emerald-100 mt-1">
                Payment of <b>₹{cardPaymentSuccess.amount.toLocaleString('en-IN')}.00</b> credited directly to Varachha Bank.
              </p>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 font-mono">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Activated Plan:</span>
                  <span className="font-bold text-slate-900 font-sans text-sm">{cardPaymentSuccess.planName}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Validity Formula:</span>
                  <span className="font-bold text-blue-700">{cardPaymentSuccess.prevDays}d + {cardPaymentSuccess.addedDays}d = {cardPaymentSuccess.totalDays} Total Days</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>New Expiration Date:</span>
                  <span className="font-bold text-emerald-700 font-sans">{cardPaymentSuccess.expiryDate}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Receipt Number:</span>
                  <span className="font-bold text-slate-900">{cardPaymentSuccess.receiptNumber}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200">
                  <span>Credited Bank Account:</span>
                  <span className="font-bold text-cyan-800">Varachha Bank ({cardPaymentSuccess.accountCredited})</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-relaxed">
                  Real-time synchronization complete! Your subscription plan, days count, and daily decrement countdown have been updated immediately across your workspace.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadReceipt({
                      receiptNumber: cardPaymentSuccess.receiptNumber,
                      id: cardPaymentSuccess.txId,
                      date: new Date().toLocaleDateString(),
                      plan: cardPaymentSuccess.planName,
                      amount: `₹${cardPaymentSuccess.amount.toLocaleString('en-IN')}`,
                      reference: cardPaymentSuccess.txId
                    });
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>Download Receipt</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCardPaymentSuccess(null)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                >
                  <span>Continue Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PAYMENT METHOD CHOICE MODAL (Razorpay vs Card Interface) */}
      {paymentChoiceModalPlan && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setPaymentChoiceModalPlan(null); }}
          className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
        >
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 my-auto animate-modal-smooth text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black font-outfit text-slate-900">
                  Select Payment Option for {paymentChoiceModalPlan.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Fee: <b className="text-slate-900">{paymentChoiceModalPlan.price}</b> &bull; Validity: <b className="text-blue-600">+{paymentChoiceModalPlan.daysToAdd} Days</b>
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setPaymentChoiceModalPlan(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Choice 1: Razorpay Gateway */}
              <div 
                onClick={() => {
                  const plan = paymentChoiceModalPlan;
                  setPaymentChoiceModalPlan(null);
                  handleUpgrade(plan);
                }}
                className="p-4 rounded-2xl border-2 border-blue-500/80 bg-blue-50/40 hover:bg-blue-50 transition-all cursor-pointer space-y-2 group shadow-xs hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Zap className="w-4 h-4 text-amber-300" />
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 uppercase bg-white px-2 py-0.5 rounded-full border border-blue-200">
                    UPI & Wallets
                  </span>
                </div>
                <h4 className="text-xs font-black text-slate-900">1. Razorpay Gateway</h4>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Official popup checkout with instant QR, NetBanking, GPay, PhonePe, and major credit/debit cards.
                </p>
                <div className="pt-2 text-xs font-bold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Open Razorpay Checkout</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Choice 2: Card Payment Interface (Varachha Bank) */}
              <div 
                onClick={() => {
                  const plan = paymentChoiceModalPlan;
                  setPaymentChoiceModalPlan(null);
                  handleSelectCardPlan(plan);
                }}
                className="p-4 rounded-2xl border-2 border-cyan-500/80 bg-cyan-50/40 hover:bg-cyan-50 transition-all cursor-pointer space-y-2 group shadow-xs hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-cyan-400 flex items-center justify-center shadow-xs">
                    <CreditCard className="w-4 h-4 text-cyan-300" />
                  </div>
                  <span className="text-[10px] font-bold text-cyan-800 uppercase bg-white px-2 py-0.5 rounded-full border border-cyan-200">
                    Direct Credit
                  </span>
                </div>
                <h4 className="text-xs font-black text-slate-900">2. Card Interface (Varachha Bank)</h4>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Pay with interactive 3D Card interface with direct real-time credit to Krushil Gadhiya's Varachha Bank account.
                </p>
                <div className="pt-2 text-xs font-bold text-cyan-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Go to Card Interface</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100">
              <span>Both methods activate your plan immediately in real-time.</span>
              <button
                type="button"
                onClick={() => setPaymentChoiceModalPlan(null)}
                className="font-bold text-slate-700 hover:underline cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
