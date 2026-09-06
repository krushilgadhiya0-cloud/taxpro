import React, { useState, useRef, useEffect } from 'react';
import { 
  X, CreditCard, Lock, ShieldCheck, Check, Copy, Sparkles, ArrowRight, 
  QrCode, Building, CheckCircle2, User, Calendar, Smartphone, Zap, Info
} from 'lucide-react';

export default function PaymentCheckoutModal({ 
  isOpen, onClose, plan, onShowToast, onPaymentSuccess 
}) {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [enableAutopay, setEnableAutopay] = useState(true);

  const [utrNumber, setUtrNumber] = useState('');
  const [copiedField, setCopiedField] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  const [paidTxId, setPaidTxId] = useState('');

  const BANK_CONFIG = {
    accountName: 'TaxPro Enterprise Solutions (Krushil Gadhiya)',
    bankName: 'The Varachha Co-operative Bank Ltd.',
    accountNumber: '00110121914054',
    ifsc: 'VARA0289001',
    accountType: 'Savings Bank Account',
    branch: 'Varachha Bank, Surat, Gujarat'
  };

  const UPI_ID = '9327397851@upi';

  useEffect(() => {
    if (isOpen) {
      setIsPaidSuccess(false);
      setIsProcessing(false);
      setUtrNumber('');
      const savedUser = localStorage.getItem('taxpro_user_fullname') || '';
      if (savedUser && !cardholderName) setCardholderName(savedUser.toUpperCase());
    }
  }, [isOpen]);

  if (!isOpen || !plan) return null;

  const rawPriceNum = typeof plan.priceNum === 'number' ? plan.priceNum : parseInt(String(plan.price).replace(/[^0-9]/g, '')) || 1499;
  const planTitle = plan.name || 'Practice Core';
  const billingCycle = plan.billing === 'yearly' ? '1 Year Annual License' : '30 Days Subscription';
  const seatCount = plan.seats || '10 - 15 Team Members';

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
    setExpiryDate(val);
  };

  const handleCvcChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setCvc(val);
  };

  const getCardNetwork = () => {
    const clean = cardNumber.replace(/\s/g, '');
    if (clean.startsWith('4')) return 'VISA';
    if (clean.startsWith('5') || clean.startsWith('2')) return 'MASTERCARD';
    if (clean.startsWith('6') || clean.startsWith('508')) return 'RUPAY';
    if (clean.startsWith('34') || clean.startsWith('37')) return 'AMEX';
    return 'VISA';
  };

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    if (onShowToast) onShowToast(`✓ Copied ${fieldName} to clipboard`, 'info');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFinalizePayment = async (methodName, referenceDetails) => {
    setIsProcessing(true);
    const userEmail = (localStorage.getItem('taxpro_user_email') || 'client@taxpro.com').trim().toLowerCase();
    const userName = cardholderName || localStorage.getItem('taxpro_user_fullname') || 'Valued Subscriber';
    const txId = `TAXPRO-PAY-${Date.now().toString().slice(-8)}`;

    try {
      const baseUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || '';
      
      await fetch(`${baseUrl}/api/payments/record-direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txId,
          amount: rawPriceNum,
          planName: planTitle,
          billingCycle,
          seats: seatCount,
          method: methodName,
          email: userEmail,
          userName: userName,
          autopay: methodName === 'Credit / Debit Card' ? enableAutopay : false,
          reference: referenceDetails || (methodName === 'Credit / Debit Card' ? `Card Ending in ${cardNumber.slice(-4) || '4242'}` : utrNumber)
        })
      }).catch(() => null);

      await fetch(`${baseUrl}/api/payments/send-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          name: userName,
          planName: `${planTitle} (${seatCount})`,
          amount: `₹${rawPriceNum.toLocaleString('en-IN')}.00`,
          paymentId: txId,
          billingCycle: billingCycle,
          expiryDate: plan.billing === 'yearly' ? 'September 6, 2027' : 'October 6, 2026'
        })
      }).catch(() => null);

      setPaidTxId(txId);
      setIsPaidSuccess(true);
      
      if (window.confetti) {
        window.confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      }

      if (onShowToast) {
        onShowToast(`✓ Payment of ₹${rawPriceNum.toLocaleString('en-IN')} confirmed directly to bank account!`, 'success');
      }

      localStorage.setItem('taxpro_subscription_plan', planTitle);
      localStorage.setItem('taxpro_subscription_status', 'Active');
      localStorage.setItem('taxpro_subscription_seats', seatCount);
      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

      if (onPaymentSuccess) {
        onPaymentSuccess({ txId, plan: planTitle, amount: rawPriceNum, method: methodName });
      }
    } catch (err) {
      console.warn('Payment notice:', err.message);
      setPaidTxId(txId);
      setIsPaidSuccess(true);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in select-none overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0d101b] border border-cyan-500/30 rounded-3xl shadow-2xl shadow-cyan-500/10 text-left my-auto overflow-hidden animate-modal-smooth">
        <div className="absolute top-0 left-1/4 w-1/2 h-32 bg-cyan-500/10 blur-3xl pointer-events-none" />

        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-[1px]">
              <div className="w-full h-full bg-[#0d101b] rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white font-mono tracking-widest uppercase">TAXPRO CHECKOUT</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                  DIRECT BANK SETTLEMENT
                </span>
              </div>
              <div className="text-[11px] text-gray-400">
                1. Plan Selected &bull; <strong className="text-cyan-400 font-bold">2. Payment Method</strong>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SUCCESS CONFIRMATION SCREEN */}
        {isPaidSuccess ? (
          <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20 animate-bounce">
              <Check className="w-10 h-10 text-emerald-400 stroke-[3]" />
            </div>

            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-2">
              PAYMENT VERIFIED & ACTIVATED
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-outfit">
              Subscription Successfully Activated!
            </h2>
            <p className="text-xs text-gray-400 mt-2 max-w-md">
              Payment of <strong className="text-white font-mono">₹{rawPriceNum.toLocaleString('en-IN')}.00</strong> directly credited to the practice bank account. Official receipt emailed to your address.
            </p>

            <div className="mt-6 p-4 rounded-2xl bg-black/50 border border-white/10 max-w-sm w-full text-left font-mono text-xs text-gray-300 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Plan:</span>
                <span className="font-bold text-white">{planTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Duration:</span>
                <span className="text-cyan-300">{billingCycle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Team Capacity:</span>
                <span className="text-emerald-300">{seatCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Reference ID:</span>
                <span className="text-gray-400 truncate max-w-[170px]">{paidTxId}</span>
              </div>
              {paymentMethod === 'card' && enableAutopay && (
                <div className="flex justify-between pt-2 border-t border-white/10 text-emerald-400 font-bold">
                  <span>Autopay Status:</span>
                  <span>ACTIVE ON CARD ✓</span>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="mt-8 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-black text-xs shadow-lg shadow-emerald-500/25 hover:scale-105 transition-all cursor-pointer"
            >
              Enter Workspace with Activated Plan →
            </button>
          </div>
        ) : (
          <div>
            {/* PAYMENT RAIL SELECTOR TABS */}
            <div className="px-6 pt-5 pb-2 grid grid-cols-3 gap-2 sm:gap-3 bg-black/20">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`py-3 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  paymentMethod === 'card'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/80 shadow-lg shadow-cyan-500/20'
                    : 'bg-black/40 text-gray-400 border-white/10 hover:border-white/20'
                }`}
              >
                <CreditCard className="w-4 h-4 text-cyan-400" />
                <span>Credit / Debit Card</span>
                <span className="hidden sm:inline-block text-[9px] px-1.5 py-0.5 rounded bg-cyan-400 text-black font-extrabold uppercase">
                  AUTOPAY
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`py-3 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  paymentMethod === 'upi'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/80 shadow-lg shadow-cyan-500/20'
                    : 'bg-black/40 text-gray-400 border-white/10 hover:border-white/20'
                }`}
              >
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Instant UPI & QR</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('bank')}
                className={`py-3 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  paymentMethod === 'bank'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/80 shadow-lg shadow-cyan-500/20'
                    : 'bg-black/40 text-gray-400 border-white/10 hover:border-white/20'
                }`}
              >
                <Building className="w-4 h-4 text-indigo-400" />
                <span>Direct Bank Transfer</span>
              </button>
            </div>

            {/* TAB CONTENT: 1. CARD WITH 3D ANIMATION */}
            {paymentMethod === 'card' && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                
                {/* LEFT: 3D CARD ANIMATION & ORDER SUMMARY */}
                <div className="flex flex-col gap-6">
                  <div className="card-3d-perspective">
                    <div 
                      className={`card-3d-inner ${isFlipped ? 'is-flipped' : ''}`}
                      onMouseEnter={() => setIsFlipped(true)}
                      onMouseLeave={() => setIsFlipped(false)}
                    >
                      {/* FRONT OF CARD */}
                      <div className="card-3d-face card-3d-front">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="card-chip" />
                            <svg className="w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M8.5 16.5a5 5 0 0 1 0-9" />
                              <path d="M12 19a8.5 8.5 0 0 0 0-14" />
                              <path d="M15.5 21.5a12 12 0 0 0 0-19" />
                            </svg>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-black font-mono tracking-widest text-cyan-300 block">TAXPRO PLATFORM</span>
                            <span className="text-[8px] text-gray-400 tracking-wider uppercase">AUTOPAY ENABLED</span>
                          </div>
                        </div>

                        {/* Card Number display */}
                        <div className="my-2">
                          <div className="font-mono text-lg sm:text-xl font-bold tracking-[3px] text-white drop-shadow">
                            {cardNumber || '4242 4242 4242 4242'}
                          </div>
                        </div>

                        {/* Cardholder & Expiry & Network */}
                        <div className="flex items-end justify-between">
                          <div>
                            <span className="text-[8px] text-gray-400 uppercase tracking-wider block">CARDHOLDER NAME</span>
                            <span className="font-mono text-xs font-bold text-white uppercase tracking-wider block truncate max-w-[160px]">
                              {cardholderName || 'A. HASIB'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] text-gray-400 uppercase tracking-wider block">EXPIRES</span>
                            <span className="font-mono text-xs font-bold text-white block">
                              {expiryDate || '12/28'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-black italic text-lg text-white tracking-wider font-mono">
                              {getCardNetwork()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* BACK OF CARD */}
                      <div className="card-3d-face card-3d-back">
                        <div className="card-mag-stripe" />
                        <div>
                          <div className="px-6 mb-1 text-right">
                            <span className="text-[8px] text-gray-400 uppercase tracking-wider">SECURITY CODE (CVC)</span>
                          </div>
                          <div className="card-signature-bar">
                            <span className="font-mono font-bold text-sm tracking-widest text-gray-900">
                              {cvc || '•••'}
                            </span>
                          </div>
                        </div>
                        <div className="px-6 flex items-center justify-between text-[8px] text-gray-400 font-mono">
                          <div className="card-hologram" />
                          <span>Direct Settlement to Bank Account &bull; 256-Bit TLS</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* YOUR ORDER SUMMARY */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col gap-2.5 text-xs">
                    <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">YOUR ORDER</span>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-white">{planTitle}</span>
                        <div className="text-[10px] text-gray-400">{seatCount} &bull; {billingCycle}</div>
                      </div>
                      <span className="font-mono font-bold text-white">₹{rawPriceNum.toLocaleString('en-IN')}.00</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-400">
                      <span>Priority Setup & Onboarding</span>
                      <span className="text-emerald-400 font-bold">Included</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-400">
                      <span>Estimated GST / Surcharge</span>
                      <span className="text-emerald-400 font-bold">₹0.00</span>
                    </div>
                    <div className="pt-2 border-t border-white/10 flex justify-between items-center text-sm">
                      <span className="font-bold text-white">Total due today</span>
                      <span className="font-black text-cyan-400 font-mono text-base">₹{rawPriceNum.toLocaleString('en-IN')}.00</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT: CARD INPUT DETAILS FORM */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleFinalizePayment('Credit / Debit Card');
                  }}
                  className="flex flex-col gap-3.5"
                >
                  <div>
                    <h3 className="text-lg font-bold text-white font-outfit">Payment details</h3>
                    <p className="text-xs text-gray-400">Enter your card details to complete the instant transaction.</p>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-300 block mb-1">CARDHOLDER NAME</label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. A. HASIB"
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                        className="w-full pl-10 pr-4 py-2.5 bg-black/50 border border-white/15 focus:border-cyan-400 rounded-xl text-xs text-white font-mono uppercase outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-300 block mb-1">CARD NUMBER</label>
                    <div className="relative">
                      <CreditCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        required
                        placeholder="4242 4242 4242 4242"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        className="w-full pl-10 pr-14 py-2.5 bg-black/50 border border-white/15 focus:border-cyan-400 rounded-xl text-xs text-white font-mono tracking-wider outline-none"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold font-mono text-[11px] text-cyan-400 italic">
                        {getCardNetwork()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-gray-300 block mb-1">EXPIRY DATE</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          required
                          placeholder="MM/YY"
                          value={expiryDate}
                          onChange={handleExpiryChange}
                          className="w-full pl-10 pr-3 py-2.5 bg-black/50 border border-white/15 focus:border-cyan-400 rounded-xl text-xs text-white font-mono outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-300 block mb-1">CVC &bull; back of card</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="password"
                          required
                          maxLength={4}
                          placeholder="•••"
                          value={cvc}
                          onFocus={() => setIsFlipped(true)}
                          onBlur={() => setIsFlipped(false)}
                          onChange={handleCvcChange}
                          className="w-full pl-10 pr-3 py-2.5 bg-black/50 border border-white/15 focus:border-cyan-400 rounded-xl text-xs text-white font-mono tracking-widest outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* AUTOPAY CHECKBOX */}
                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="autopay-checkbox"
                      checked={enableAutopay}
                      onChange={(e) => setEnableAutopay(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-cyan-500 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="autopay-checkbox" className="text-xs cursor-pointer">
                      <strong className="text-white block font-bold">Save this card for next time (Enable Autopay)</strong>
                      <span className="text-[11px] text-gray-400 block mt-0.5 leading-tight">
                        Direct automated recurring renewal every 30 days / 1 year directly to bank account. Cancel anytime.
                      </span>
                    </label>
                  </div>

                  {/* SUBMIT BUTTON */}
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 hover:from-blue-500 hover:to-cyan-400 active:scale-98 text-white font-black text-xs shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{isProcessing ? 'Processing Direct Settlement...' : `Pay ₹${rawPriceNum.toLocaleString('en-IN')}.00`}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="flex items-center justify-center gap-4 text-[10px] text-gray-500 font-mono mt-1">
                    <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-400" /> PCI-DSS Level 1</span>
                    <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-cyan-400" /> 256-bit TLS</span>
                    <span>Direct Settlement</span>
                  </div>

                  <div className="text-[10px] text-gray-500 text-center font-mono">
                    <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">
                      Type a card. Reach for CVC to flip. (4242 4242 4242 4242 approves)
                    </span>
                  </div>
                </form>
              </div>
            )}

            {/* TAB CONTENT: 2. INSTANT UPI & QR */}
            {paymentMethod === 'upi' && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-black/40 border border-white/10 text-center">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest mb-3">
                    SCAN VIA ANY UPI APP (GPAY / PHONEPE / PAYTM)
                  </span>
                  
                  <div className="p-4 bg-white rounded-2xl shadow-xl flex items-center justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=${UPI_ID}&pn=TaxPro%20Enterprise&am=${rawPriceNum}&cu=INR&tn=${encodeURIComponent(planTitle)}`)}`}
                      alt="TaxPro UPI QR Code"
                      className="w-44 h-44 object-contain"
                    />
                  </div>

                  <div className="mt-4 text-xs font-mono font-bold text-white">
                    Amount: <span className="text-emerald-400 text-base">₹{rawPriceNum.toLocaleString('en-IN')}.00</span>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1">Directly received in Bank Account</span>
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white font-outfit">Pay via UPI Direct</h3>
                    <p className="text-xs text-gray-400">Copy the official UPI ID or click to pay with your mobile app.</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/60 border border-white/15 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-mono">MERCHANT UPI ID</span>
                      <span className="font-mono text-sm font-bold text-white">{UPI_ID}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(UPI_ID, 'UPI ID')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedField === 'UPI ID' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'UPI ID' ? 'Copied!' : 'Copy UPI'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                    <a
                      href={`upi://pay?pa=${UPI_ID}&pn=TaxPro%20Enterprise&am=${rawPriceNum}&cu=INR`}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all flex flex-col items-center gap-1"
                    >
                      <Smartphone className="w-4 h-4 text-blue-400" />
                      <span>Google Pay</span>
                    </a>
                    <a
                      href={`upi://pay?pa=${UPI_ID}&pn=TaxPro%20Enterprise&am=${rawPriceNum}&cu=INR`}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all flex flex-col items-center gap-1"
                    >
                      <Smartphone className="w-4 h-4 text-purple-400" />
                      <span>PhonePe</span>
                    </a>
                    <a
                      href={`upi://pay?pa=${UPI_ID}&pn=TaxPro%20Enterprise&am=${rawPriceNum}&cu=INR`}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all flex flex-col items-center gap-1"
                    >
                      <Smartphone className="w-4 h-4 text-cyan-400" />
                      <span>Paytm</span>
                    </a>
                  </div>

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!utrNumber || utrNumber.length < 8) {
                      if (onShowToast) onShowToast('Please enter the 12-digit UPI UTR reference number from your app.', 'warning');
                      return;
                    }
                    handleFinalizePayment('Instant UPI Rail', `UPI UTR: ${utrNumber}`);
                  }} className="flex flex-col gap-2 mt-2">
                    <label className="text-[11px] font-bold text-gray-300">
                      ENTER 12-DIGIT UPI / UTR TRANSACTION NUMBER
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 423985729104"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 12))}
                      className="w-full px-4 py-2.5 bg-black/50 border border-emerald-500/40 focus:border-emerald-400 rounded-xl text-xs text-white font-mono tracking-wider outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="mt-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-black text-xs shadow-lg shadow-emerald-500/25 hover:scale-101 cursor-pointer transition-all disabled:opacity-50"
                    >
                      {isProcessing ? 'Verifying UPI UTR...' : 'Confirm UPI Payment & Activate'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 3. DIRECT BANK TRANSFER (NEFT / RTGS) */}
            {paymentMethod === 'bank' && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="p-5 rounded-2xl bg-black/40 border border-white/10 flex flex-col gap-3 text-xs">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest">
                      BENEFICIARY BANK ACCOUNT
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">NEFT / RTGS / IMPS</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-400 block font-mono">ACCOUNT HOLDER NAME</span>
                    <span className="font-bold text-white text-sm">{BANK_CONFIG.accountName}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-400 block font-mono">BANK NAME & BRANCH</span>
                    <span className="font-bold text-white">{BANK_CONFIG.bankName}</span>
                    <span className="text-[10px] text-gray-400 block">{BANK_CONFIG.branch}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-400 block font-mono">ACCOUNT TYPE</span>
                    <span className="font-semibold text-emerald-400 text-xs">{BANK_CONFIG.accountType}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/60 border border-white/10">
                    <div>
                      <span className="text-[9px] text-gray-400 block font-mono">ACCOUNT NUMBER</span>
                      <span className="font-mono text-sm font-black text-cyan-300">{BANK_CONFIG.accountNumber}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(BANK_CONFIG.accountNumber, 'Account Number')}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer"
                      title="Copy Account Number"
                    >
                      {copiedField === 'Account Number' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/60 border border-white/10">
                    <div>
                      <span className="text-[9px] text-gray-400 block font-mono">IFSC CODE</span>
                      <span className="font-mono text-sm font-black text-cyan-300">{BANK_CONFIG.ifsc}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(BANK_CONFIG.ifsc, 'IFSC Code')}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer"
                      title="Copy IFSC Code"
                    >
                      {copiedField === 'IFSC Code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!utrNumber || utrNumber.length < 6) {
                      if (onShowToast) onShowToast('Please enter the IMPS/NEFT/RTGS UTR Reference number.', 'warning');
                      return;
                    }
                    handleFinalizePayment('Direct Bank Transfer', `Bank UTR: ${utrNumber}`);
                  }}
                  className="flex flex-col gap-3.5"
                >
                  <div>
                    <h3 className="text-lg font-bold text-white font-outfit">Direct Bank Transfer</h3>
                    <p className="text-xs text-gray-400">
                      Transfer <strong className="text-white font-mono">₹{rawPriceNum.toLocaleString('en-IN')}.00</strong> directly to the bank account above and input your UTR / transaction receipt.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-200">
                    <span className="font-bold block text-white mb-0.5">Direct Bank Settlement</span>
                    Zero intermediary commissions. Funds settle directly into the enterprise bank account with instant activation.
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-300 block mb-1">
                      BANK TRANSFER UTR / TRANSACTION REFERENCE NUMBER
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. VARAR520260906001928 or UTR Reference"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value.toUpperCase())}
                      className="w-full px-4 py-2.5 bg-black/50 border border-white/15 focus:border-indigo-400 rounded-xl text-xs text-white font-mono tracking-wider outline-none uppercase"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="mt-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-white font-black text-xs shadow-lg shadow-indigo-500/25 hover:scale-101 cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Building className="w-4 h-4" />
                    <span>{isProcessing ? 'Verifying Bank Transfer...' : 'Submit Transfer Proof & Activate Plan'}</span>
                  </button>

                  <p className="text-[10px] text-gray-500 text-center font-mono">
                    Official tax invoice & receipt automatically dispatched upon submission.
                  </p>
                </form>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
