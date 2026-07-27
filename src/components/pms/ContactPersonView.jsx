import React, { useState } from 'react';
import { UserCheck, Mail, Phone, Building, Plus, Trash2, X, AlertCircle } from 'lucide-react';

export default function ContactPersonView({ onShowToast }) {
  const [contacts, setContacts] = useState([
    { id: 1, name: 'Rajesh Mehta', designation: 'Managing Director', client: 'Acme Advisory Corp', email: 'rmehta@acme.com', phone: '9876511223' },
    { id: 2, name: 'Priya Sharma', designation: 'Head of Finance', client: 'Sterling Capital Pvt Ltd', email: 'psharma@sterling.com', phone: '9812399887' },
    { id: 3, name: 'Amit Patel', designation: 'Chief Technology Officer', client: 'NexGen Tech Solutions', email: 'apatel@nexgen.io', phone: '9765444332' },
  ]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    client: '',
    email: '',
    phone: '',
    desc: ''
  });

  const handleAddContactSubmit = (e) => {
    e.preventDefault();
    
    // Strict 10-digit validation
    const purePhone = formData.phone.replace(/[^0-9]/g, '');
    if (purePhone.length !== 10) {
      if (onShowToast) onShowToast('Phone number must be exactly 10 digits!', 'error');
      return;
    }

    setContacts(prev => [
      {
        id: Date.now(),
        name: formData.name,
        designation: formData.desc || 'New Contact',
        client: formData.client || 'Unknown Firm',
        email: formData.email,
        phone: purePhone
      },
      ...prev
    ]);

    setIsAddModalOpen(false);
    setFormData({ name: '', client: '', email: '', phone: '', desc: '' });
    if (onShowToast) onShowToast(`Contact ${formData.name} successfully saved to directory!`, 'success');
  };

  const executeDelete = () => {
    setContacts(prev => prev.filter(x => x.id !== deleteId));
    setDeleteId(null);
    if (onShowToast) onShowToast('Contact removed from system.', 'info');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f3f4f6] min-h-screen text-gray-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold font-outfit text-[#1e1e2d]">Contact Persons</h1>
          <p className="text-xs text-gray-500 mt-1">Authorized client representatives and key managerial contacts.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" /> New Contact
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {contacts.map((c) => (
          <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-indigo-600">
                {c.name.split(' ').map(n=>n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <h3 className="font-extrabold text-gray-900 text-sm truncate">{c.name}</h3>
                <span className="text-xs text-indigo-600 font-semibold truncate block">{c.designation}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-xs border-t border-gray-100 pt-3">
              <span className="text-gray-600 flex items-center gap-2 font-medium truncate">
                <Building className="w-4 h-4 text-gray-400 flex-shrink-0" /> {c.client}
              </span>
              <span className="text-gray-600 flex items-center gap-2 font-medium truncate">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" /> {c.email}
              </span>
              <span className="text-gray-600 flex items-center gap-2 font-medium truncate">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" /> +91 {c.phone}
              </span>
            </div>
            
            <div className="absolute top-4 right-4">
               <button 
                 onClick={() => setDeleteId(c.id)}
                 className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded transition-colors"
               >
                 <Trash2 className="w-4 h-4" />
               </button>
            </div>
          </div>
        ))}
      </div>

      {/* NEW CONTACT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 flex flex-col">
            
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-gray-900 text-lg">Add New Contact</h3>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Client Representative Registry</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 bg-gray-50 text-gray-500 rounded-full hover:bg-gray-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              <form id="contact-add-form" onSubmit={handleAddContactSubmit} className="flex flex-col gap-4 text-sm">
                <div>
                  <label className="font-bold text-gray-700 block mb-1 text-xs">Full Name *</label>
                  <input type="text" required placeholder="e.g. John Doe" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 outline-none" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1 text-xs">Phone Number * (10 Digits)</label>
                    <input type="tel" required maxLength="10" placeholder="9876543210" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value.replace(/[^0-9]/g, '')})} className="w-full bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 outline-none font-mono" />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1 text-xs">Email Address *</label>
                    <input type="email" required placeholder="name@company.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 outline-none" />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1 text-xs">Associated Client / Company *</label>
                  <input type="text" required placeholder="Acme Corp" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 outline-none" />
                </div>

                <div>
                   <label className="font-bold text-gray-700 block mb-1 text-xs">Designation / Description</label>
                   <input type="text" placeholder="General Manager" value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 outline-none" />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 text-right">
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors mr-2">Cancel</button>
              <button form="contact-add-form" type="submit" className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-colors">Save Contact</button>
            </div>

          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center border border-red-100 animate-shake">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900 mb-2">Delete Contact</h3>
            <p className="text-sm text-gray-500 mb-6 font-medium">Are you sure you want to permanently remove this contact? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={executeDelete} className="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
