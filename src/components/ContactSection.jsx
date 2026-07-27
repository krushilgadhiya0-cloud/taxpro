import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';

export default function ContactSection({ onShowToast }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    content: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSent(true);
      if (onShowToast) onShowToast('Transmission successful. We will respond shortly.', 'success');
      
      // Reset form
      setTimeout(() => {
        setIsSent(false);
        setFormData({ name: '', email: '', subject: '', content: '' });
      }, 3000);
    }, 1500);
  };

  const contactOptions = [
    {
      id: 'email',
      icon: Mail,
      title: 'Email Support',
      value: 'support@taxpro.ai',
      subtext: 'Avg response: 2 hrs',
      color: 'blue'
    },
    {
      id: 'phone',
      icon: Phone,
      title: 'Technical Helpline',
      value: '+91 98765 43210',
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
          <h2 className="text-4xl md:text-5xl font-extrabold font-outfit text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 mb-4">
            Initialize Contact
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Establish a secure transmission with our support fleet. Whether you need integration assistance or technical support, we're ready to assist.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Contact Cards */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {contactOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <div key={opt.id} className="glass-panel p-6 border border-white/10 hover:border-cyan-500/30 transition-all duration-300 group">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl bg-${opt.color}-500/10 border border-${opt.color}-500/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`w-6 h-6 text-${opt.color}-400`} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1 font-outfit">{opt.title}</h4>
                      <p className="text-base font-semibold text-gray-200 mb-2">{opt.value}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                        {opt.subtext}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-8">
            <div className="relative p-[1px] rounded-3xl bg-gradient-to-b from-cyan-500/30 via-blue-600/20 to-purple-600/10 shadow-2xl shadow-cyan-900/20">
              <div className="bg-[#0f1014]/90 backdrop-blur-2xl rounded-3xl p-8 md:p-10">
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
                        placeholder="Johnathan Doe"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-gray-600"
                      />
                    </div>

                    {/* Fleet Email */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fleet Email</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@interstellar.com"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-gray-600"
                      />
                    </div>
                  </div>

                  {/* Mission Subject */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mission Subject</label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="Support / Integration / Features"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-gray-600"
                    />
                  </div>

                  {/* Transmission Content */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Transmission Content</label>
                    <textarea
                      required
                      rows={5}
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="How can we assist your workflow today?"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-gray-600 resize-none"
                    ></textarea>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || isSent}
                      className="w-full md:w-auto relative group overflow-hidden bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl px-8 py-4 font-bold tracking-wide transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3 shadow-lg shadow-cyan-500/20"
                    >
                      {/* Button Hover Effect Layer */}
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                      
                      <span className="relative z-10">
                        {isSubmitting ? 'TRANSMITTING...' : isSent ? 'TRANSMISSION SENT' : 'ENGAGE TRANSMISSION'}
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
