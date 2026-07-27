import React, { useState } from 'react';
import { 
  CreditCard, 
  Send, 
  Search, 
  Filter, 
  Smartphone, 
  Building2, 
  Wallet, 
  Banknote, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign,
  PieChart as PieIcon,
  CheckCircle2,
  Sparkles,
  Zap,
  Plus
} from 'lucide-react';

export default function PaymentsView({ onShowToast }) {
  const [selectedMethod, setSelectedMethod] = useState('UPI');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showSendModal, setShowSendModal] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const paymentMethods = [
    { id: 'UPI', label: 'UPI Instant', icon: Smartphone, desc: 'Zero fee direct bank' },
    { id: 'Card', label: 'Credit/Debit Card', icon: CreditCard, desc: 'Visa, Mastercard, Amex' },
    { id: 'Net Banking', label: 'Net Banking', icon: Building2, desc: 'NEFT, RTGS, IMPS' },
    { id: 'Wallet', label: 'Digital Wallet', icon: Wallet, desc: 'Apple Pay, Revolut' },
    { id: 'Cash', label: 'Cash Settlement', icon: Banknote, desc: 'Physical currency log' },
    { id: 'Bank Wire', label: 'SWIFT Wire', icon: Building2, desc: 'Cross-border enterprise' },
  ];

  const categories = ['All', 'Salary', 'Travel', 'Food', 'Gaming', 'Shopping', 'Custom'];

  const transactions = [
    { id: 'PAY-108', recipient: 'Alex Mercer (Lead Dev)', category: 'Salary', method: 'UPI', amount: '$4,800.00', status: 'Success', date: 'Today, 09:42 AM' },
    { id: 'PAY-107', recipient: 'AWS Cloud Hosting', category: 'Custom', method: 'Card', amount: '$2,840.00', status: 'Success', date: 'Yesterday' },
    { id: 'PAY-106', recipient: 'Uber Business Travel', category: 'Travel', method: 'Wallet', amount: '$145.50', status: 'Success', date: 'Jul 23, 2026' },
    { id: 'PAY-105', recipient: 'DoorDash Team Catering', category: 'Food', method: 'Card', amount: '$320.00', status: 'Success', date: 'Jul 22, 2026' },
    { id: 'PAY-104', recipient: 'Steam Enterprise Arcade', category: 'Gaming', method: 'UPI', amount: '$89.00', status: 'Success', date: 'Jul 20, 2026' },
    { id: 'PAY-103', recipient: 'Office Supplies & Gear', category: 'Shopping', method: 'Net Banking', amount: '$1,250.00', status: 'Success', date: 'Jul 19, 2026' },
  ];

  const filteredTransactions = transactions.filter((t) => {
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSearch = t.recipient.toLowerCase().includes(searchQuery.toLowerCase()) || t.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSendPayment = (e) => {
    e.preventDefault();
    if (!recipient || !amount) {
      onShowToast('Please fill in recipient and amount.', 'warning');
      return;
    }

    onShowToast(`Sending $${amount} to ${recipient} via ${selectedMethod}...`, 'info');

    setTimeout(() => {
      onShowToast(`Payment of $${amount} successfully sent to ${recipient}!`, 'success');
      setShowSendModal(false);
      setRecipient('');
      setAmount('');
      if (window.confetti) {
        window.confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } });
      }
    }, 1200);
  };

  return (
    <div className="pt-24 pb-16 min-h-screen relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-white font-outfit">Payments & Transfers</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Multi-Rail Engine
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Execute instant UPI, Card, Net Banking, and Bank Wire transactions with zero latency.</p>
        </div>

        <button
          onClick={() => setShowSendModal(true)}
          className="btn-neon-primary px-6 py-3 text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20"
        >
          <Send className="w-4 h-4 text-black" />
          <span>Send Instant Payment</span>
        </button>
      </div>

      {/* SUPPORTED PAYMENT METHOD SELECTORS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {paymentMethods.map((m) => {
          const Icon = m.icon;
          const isSelected = selectedMethod === m.id;
          return (
            <div
              key={m.id}
              onClick={() => setSelectedMethod(m.id)}
              className={`p-4 rounded-2xl cursor-pointer border backdrop-blur-xl transition-all duration-300 ${
                isSelected
                  ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-lg shadow-cyan-500/20 scale-105'
                  : 'bg-white/[0.03] border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
              }`}
            >
              <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-cyan-400' : 'text-gray-400'}`} />
              <div className="text-xs font-bold">{m.label}</div>
              <div className="text-[10px] text-gray-400 mt-1">{m.desc}</div>
            </div>
          );
        })}
      </div>

      {/* SEARCH AND CATEGORY FILTERS */}
      <div className="glass-panel p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search payments by recipient or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-input pl-10 pr-4 py-2 text-xs"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory === c
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                  : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

      </div>

      {/* TRANSACTIONS TABLE */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white font-outfit mb-4">Payment Ledger & History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-gray-400">
                <th className="pb-3">Recipient / Description</th>
                <th className="pb-3">Method</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 font-semibold text-white">
                    <div className="flex flex-col">
                      <span>{t.recipient}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{t.id}</span>
                    </div>
                  </td>
                  <td className="py-3 font-semibold text-cyan-400">{t.method}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-md bg-white/5 text-gray-300 border border-white/10 text-[10px]">
                      {t.category}
                    </span>
                  </td>
                  <td className="py-3 font-mono font-bold text-white">{t.amount}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3 text-gray-400 font-mono">{t.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SEND MONEY MODAL */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl">
          <div className="w-full max-w-md glass-panel p-6 border border-white/15 rounded-3xl relative">
            <h3 className="text-xl font-bold text-white font-outfit mb-2">Execute Payment</h3>
            <p className="text-xs text-gray-400 mb-6">Select rail: <strong className="text-cyan-400">{selectedMethod}</strong></p>

            <form onSubmit={handleSendPayment} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Recipient VPA / Account</label>
                <input
                  type="text"
                  placeholder="e.g. alex@taxpro or ACC-984019"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full glass-input p-3 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Amount ($ USD)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full glass-input p-3 text-xs font-mono text-cyan-400 font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-neon-primary px-6 py-2 text-xs font-bold"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
