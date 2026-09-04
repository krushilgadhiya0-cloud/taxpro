import React, { useState } from 'react';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  CheckCircle2, 
  HelpCircle, 
  Calendar, 
  Wrench, 
  Edit3, 
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export default function ContactSection({ onShowToast }) {
  // 2-3 default preset questions for CA/Tax practice inquiries + "other"
  const DEFAULT_QUESTIONS = [
    {
      id: 'migration',
      label: 'Client & Compliance Migration',
      question: 'How do I migrate my CA firm\'s clients, GST/ITR registers, and past records to TaxPro?',
      icon: HelpCircle,
      badge: 'Most Popular'
    },
    {
      id: 'demo',
      label: 'Schedule Practice Demo',
      question: 'Can I schedule a 1-on-1 personalized demo of PMS, Staff Attendance & WhatsApp Invoicing?',
      icon: Calendar,
      badge: 'Walkthrough'
    },
    {
      id: 'technical',
      label: 'Technical & API Support',
      question: 'Need technical assistance with PostgreSQL database sync, custom SMTP or API integration.',
      icon: Wrench,
      badge: 'Support'
    },
    {
      id: 'other',
      label: 'Other / Custom Topic',
      question: '',
      icon: Edit3,
      badge: 'Write Anything'
    }
  ];

  const [selectedQuestionId, setSelectedQuestionId] = useState('migration');
  const [customSubject, setCustomSubject] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: DEFAULT_QUESTIONS[0].question,
    content: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  // Handle question preset selection
  const handleSelectQuestion = (q) => {
    setSelectedQuestionId(q.id);
    if (q.id === 'other') {
      setFormData(prev => ({ ...prev, subject: customSubject || '' }));
    } else {
      setFormData(prev => ({ ...prev, subject: q.question }));
    }
  };

  // Handle custom subject change when "Other" is selected
  const handleCustomSubjectChange = (val) => {
    setCustomSubject(val);
    setFormData(prev => ({ ...prev, subject: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalSubject = (formData.subject || customSubject || 'General Practice Inquiry').trim();
    if (!finalSubject) {
      if (onShowToast) onShowToast('Please specify a mission subject or inquiry question.', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Silent PostgreSQL / Backend Integration log
      try {
        const baseUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || '';
        await fetch(`${baseUrl}/api/integrations/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            subject: finalSubject,
            message: formData.content,
            category: selectedQuestionId
          })
        }).catch(() => null);
      } catch (err) {}

      // 2. Formsubmit.co background dispatch
      await fetch("https://formsubmit.co/ajax/krushilgadhiya0@gmail.com", {
        method: "POST",
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: finalSubject,
          message: formData.content,
          inquiryCategory: selectedQuestionId,
          _template: "box"
        })
      });

      setIsSubmitting(false);
      setIsSent(true);
      if (onShowToast) onShowToast('✓ Transmission transmitted securely to TaxPro headquarters!', 'success');
      
      // Reset form
      setTimeout(() => {
        setIsSent(false);
        setFormData({ 
          name: '', 
          email: '', 
          subject: DEFAULT_QUESTIONS[0].question, 
          content: '' 
        });
        setSelectedQuestionId('migration');
        setCustomSubject('');
      }, 3500);
    } catch (error) {
      setIsSubmitting(false);
      if (onShowToast) onShowToast('Transmission error. Please try again.', 'error');
    }
  };

  const contactOptions = [
    {
      id: 'email',
      icon: Mail,
      title: 'Email Support',
      value: 'krushilgadhiya0@gmail.com',
      subtext: 'Avg response: 1-2 hrs',
      color: 'blue'
    },
    {
      id: 'phone',
      icon: Phone,
      title: 'Technical Helpline',
      value: '+91 93273 97851',
      subtext: 'Mon - Fri, 9am - 6pm',
      color: 'emerald'
    },
    {
      id: 'location',
      icon: MapPin,
      title: 'Global Headquarters',
      value: 'Silicon Square, Block 7',
      subtext: 'Bangalore, KA, India',
      color: 'purple'
    }
  ];

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col justify-center">
      <div className="max-w-7xl mx-auto w-full">
        
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            24/7 Practice Intelligence Support
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold font-outfit text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 mb-4">
            Initialize Contact
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base">
            Establish a secure transmission with our advisory and engineering fleet. Select a standard practice question or enter your own custom inquiry below.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Contact Cards */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {contactOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <div key={opt.id} className="glass-panel p-6 border border-white/10 hover:border-cyan-500/30 transition-all duration-300 group rounded-2xl bg-white/[0.02]">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1 font-outfit">{opt.title}</h4>
                      <p className="text-base font-semibold text-gray-200 mb-2">{opt.value}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {opt.subtext}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Guaranteed Support SLA Box */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-900/20 via-cyan-900/10 to-transparent border border-cyan-500/20 text-xs text-gray-400 flex items-start gap-3.5">
              <ShieldCheck className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block mb-1">Encrypted Transmission Protocol</span>
                All inquiries are securely logged in our PostgreSQL database and routed directly to specialized practice managers with high-priority dispatch.
              </div>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-8">
            <div className="relative p-[1px] rounded-3xl bg-gradient-to-b from-cyan-500/30 via-blue-600/20 to-purple-600/10 shadow-2xl shadow-cyan-900/20">
              <div className="bg-[#0f1014]/90 backdrop-blur-2xl rounded-3xl p-6 sm:p-10">
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="CA Vikramaditya Sharma"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-gray-600"
                      />
                    </div>

                    {/* Fleet Email */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Email</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="sharma.associates@gmail.com"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-gray-600"
                      />
                    </div>
                  </div>

                  {/* MISSION SUBJECT & DEFAULT QUESTIONS PICKER */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                        Mission Subject & Related Practice Questions
                      </label>
                      <span className="text-[11px] text-gray-500 font-medium">Choose a default question or write your own</span>
                    </div>

                    {/* 2-3 Default Questions + Other Question Pills */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {DEFAULT_QUESTIONS.map((q) => {
                        const QIcon = q.icon;
                        const isSelected = selectedQuestionId === q.id;
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => handleSelectQuestion(q)}
                            className={`text-left p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-2 cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-500/15 border-cyan-400 shadow-md shadow-cyan-500/15 text-white'
                                : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20 hover:bg-white/[0.03]'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="flex items-center gap-2 text-xs font-bold">
                                <QIcon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-gray-400'}`} />
                                {q.label}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                isSelected ? 'bg-cyan-400 text-black font-extrabold' : 'bg-white/5 text-gray-400'
                              }`}>
                                {q.badge}
                              </span>
                            </div>
                            
                            {q.question && (
                              <p className={`text-[11px] leading-relaxed line-clamp-2 ${isSelected ? 'text-gray-200' : 'text-gray-500'}`}>
                                "{q.question}"
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* If "Other" is selected, display the custom subject input box so he can write anything */}
                    {selectedQuestionId === 'other' ? (
                      <div className="mt-1 animate-fade-in flex flex-col gap-1.5">
                        <label className="text-[11px] font-semibold text-cyan-300 flex items-center gap-1">
                          <Edit3 className="w-3 h-3" />
                          Write your custom mission subject or inquiry topic:
                        </label>
                        <input
                          type="text"
                          required
                          value={customSubject}
                          onChange={(e) => handleCustomSubjectChange(e.target.value)}
                          placeholder="e.g., Inquiring about custom MCA & ROC compliance integration..."
                          className="w-full bg-black/60 border border-cyan-500/40 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all placeholder:text-gray-600 shadow-inner"
                        />
                      </div>
                    ) : (
                      /* If one of the 3 presets is selected, allow refining or editing the subject */
                      <div className="mt-1 flex flex-col gap-1">
                        <input
                          type="text"
                          required
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-cyan-300 text-xs font-semibold focus:outline-none focus:border-cyan-500/40 transition-all"
                        />
                      </div>
                    )}
                  </div>

                  {/* Transmission Content - Write Anything freely */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Transmission Content & Message Details
                      </label>
                      <span className="text-[11px] text-gray-500">Provide any specific details or questions</span>
                    </div>
                    <textarea
                      required
                      rows={4}
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="How can our practice advisors or engineering team assist your firm today? Write any questions, requirements, or timeline here..."
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-gray-600 resize-none"
                    ></textarea>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || isSent}
                      className="w-full md:w-auto relative group overflow-hidden bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl px-8 py-4 font-bold tracking-wide transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3 shadow-lg shadow-cyan-500/20 cursor-pointer"
                    >
                      {/* Button Hover Effect Layer */}
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                      
                      <span className="relative z-10">
                        {isSubmitting ? 'TRANSMITTING...' : isSent ? 'TRANSMISSION DELIVERED' : 'ENGAGE TRANSMISSION'}
                      </span>
                      
                      <div className="relative z-10 w-5 h-5 flex items-center justify-center overflow-hidden">
                        {isSubmitting ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : isSent ? (
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        ) : (
                          <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        )}
                      </div>
                    </button>
                  </div>

                </form>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

