import React, { useState, useEffect } from 'react';
import { UserCheck, Mail, Phone, Building, Plus, Trash2, X, AlertCircle, Printer, Download, Search, ArrowLeft, Users, Briefcase, Edit2, Save } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { printHtml } from '../../lib/printHelper';
import { logAuditActivity } from '../../lib/auditLogger';

export default function ContactPersonView({ onShowToast }) {
  const [contacts, setContacts] = useState([]);
  const [clientOptions, setClientOptions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    client: '',
    email: '',
    phone: '',
    desc: ''
  });

  const fetchContactsData = async () => {
    setIsLoading(true);
    try {
      const [clientsRes, contactsRes] = await Promise.all([
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('contact_persons').select('*').order('created_at', { ascending: false })
      ]);

      const clientsData = clientsRes.data || [];
      const directContacts = contactsRes.data || [];

      if (clientsData.length > 0) {
        setClientOptions(clientsData.map(c => c.name));
      }
      
      // Merge client default contacts with custom contact_persons table entries
      const clientContacts = clientsData.map(c => ({
        id: `CP-${c.id}`,
        name: c.contact_person || c.name,
        designation: 'Managing Director / Authorized Signatory',
        client: c.name,
        email: c.email || 'contact@client.com',
        phone: c.phone || '+91 98000 00000',
        pan: c.pan || '—',
        fileNo: c.file_no || '—'
      }));

      const customContacts = directContacts.map(c => ({
        id: c.id,
        name: c.name,
        designation: c.designation || 'Authorized Corporate Liaison',
        client: c.client_name || 'Enterprise Client',
        email: c.email || '',
        phone: c.phone || '',
        pan: '—',
        fileNo: '—'
      }));

      const merged = [...customContacts, ...clientContacts];
      const unique = [];
      const seen = new Set();
      merged.forEach(item => {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          unique.push(item);
        }
      });

      setContacts(unique);
    } catch (e) {
      console.error('[Contact Person Fetch Error]:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContactsData();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setEditingContact(null);
        setDeleteId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAddContactSubmit = async (e) => {
    e.preventDefault();
    
    // Strict 10-digit validation
    const purePhone = formData.phone.replace(/[^0-9]/g, '');
    if (purePhone.length < 10) {
      if (onShowToast) onShowToast('Phone number must contain at least 10 digits.', 'error');
      return;
    }

    const contactId = `CP-${Date.now()}`;
    const newContact = {
      id: contactId,
      name: formData.name,
      designation: formData.desc || 'Primary Corporate Liaison',
      client: formData.client || 'Enterprise Client',
      email: formData.email,
      phone: purePhone
    };

    setContacts(prev => [newContact, ...prev]);
    setIsAddModalOpen(false);
    setFormData({ name: '', client: '', email: '', phone: '', desc: '' });

    // Direct save to PostgreSQL contact_persons table
    try {
      await supabase.from('contact_persons').insert([{
        id: contactId,
        name: formData.name.trim(),
        designation: formData.desc || 'Primary Corporate Liaison',
        client_name: formData.client || 'Enterprise Client',
        email: formData.email.trim(),
        phone: purePhone
      }]);
    } catch (err) {
      console.warn('[Contact Person DB Insert Note]:', err.message);
    }

    logAuditActivity({
      action: 'ADD_CONTACT',
      module: 'Client Contacts',
      details: `Added contact person "${newContact.name}" for client "${newContact.client}" (Phone: ${newContact.phone})`,
      metadata: { id: contactId, name: newContact.name, client: newContact.client }
    });

    if (onShowToast) onShowToast(`Contact person "${formData.name}" successfully added!`, 'success');
  };

  const startEditContact = (contact) => {
    setEditingContact({
      ...contact,
      phone: (contact.phone || '').replace(/[^0-9]/g, '')
    });
  };

  const handleEditContactSubmit = async (e) => {
    e.preventDefault();
    if (!editingContact || !editingContact.name) return;

    const purePhone = (editingContact.phone || '').replace(/[^0-9]/g, '');
    if (purePhone.length < 10) {
      if (onShowToast) onShowToast('Phone number must contain at least 10 digits.', 'error');
      return;
    }

    try {
      await supabase.from('contact_persons').upsert([{
        id: editingContact.id,
        name: editingContact.name.trim(),
        designation: editingContact.designation || 'Authorized Corporate Liaison',
        client_name: editingContact.client || 'Enterprise Client',
        email: (editingContact.email || '').trim(),
        phone: purePhone
      }]);

      setContacts(prev => prev.map(c => c.id === editingContact.id ? { ...editingContact, phone: purePhone } : c));
      
      logAuditActivity({
        action: 'UPDATE_CONTACT',
        module: 'Client Contacts',
        details: `Updated contact details for "${editingContact.name}" (Client: "${editingContact.client || 'Enterprise'}")`,
        metadata: { id: editingContact.id, name: editingContact.name }
      });
      
      setEditingContact(null);
      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

      if (onShowToast) onShowToast(`✓ Contact "${editingContact.name}" updated successfully!`, 'success');
    } catch (err) {
      if (onShowToast) onShowToast(`Failed to update contact: ${err.message}`, 'error');
    }
  };

  const executeDelete = async () => {
    const idToDelete = deleteId;
    const targetContact = contacts.find(c => c.id === idToDelete);
    setContacts(prev => prev.filter(x => x.id !== idToDelete));
    setDeleteId(null);

    try {
      await supabase.from('contact_persons').delete().eq('id', String(idToDelete));
    } catch (e) {}

    logAuditActivity({
      action: 'DELETE_CONTACT',
      module: 'Client Contacts',
      details: `Deleted contact person "${targetContact?.name || idToDelete}" (${targetContact?.client || 'Enterprise Client'})`,
      metadata: { id: idToDelete }
    });

    if (onShowToast) onShowToast('Contact person removed successfully.', 'info');
  };

  const handlePrintContactDirectory = () => {
    const printList = filteredContacts.length > 0 ? filteredContacts : contacts;
    if (printList.length === 0) {
      if (onShowToast) onShowToast('No contact persons available to print.', 'warning');
      return;
    }

    const rows = printList.map((c, i) => `
      <tr style="border-bottom: 1px solid #e5e7eb; background: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
        <td style="text-align: center; color: #6b7280; font-family: monospace;">${i + 1}</td>
        <td><strong style="color: #111827; font-size: 11.5px;">${c.name || '—'}</strong></td>
        <td style="color: #4b5563; font-weight: 600;">${c.designation || 'Liaison'}</td>
        <td style="color: #4338ca; font-weight: bold;">${c.client || '—'}</td>
        <td style="font-family: monospace; font-weight: 600;">${c.phone || '—'}</td>
        <td style="font-size: 10px; color: #4b5563;">${c.email || '—'}</td>
      </tr>
    `).join('');

    const bodyHtml = `
      <div style="margin-bottom: 12px; font-weight: 800; font-size: 13px; color: #1e293b;">
        Authorized Contact Persons & Client Liaison Directory (${printList.length} Records)
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 35px; text-align: center;">#</th>
            <th>Contact Person Name</th>
            <th>Designation / Role</th>
            <th>Associated Client / Company</th>
            <th>Phone Number</th>
            <th>Email Address</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    printHtml('Contact Persons Directory', bodyHtml);
    if (onShowToast) onShowToast('🖨️ Generating printable contact directory...', 'info');
  };

  const handleDownloadCSV = () => {
    if (contacts.length === 0) {
      if (onShowToast) onShowToast('No contact records available to export.', 'warning');
      return;
    }
    const headers = ['Contact ID', 'Contact Person Name', 'Designation / Role', 'Associated Client / Company', 'Phone Number', 'Email Address'];
    const rows = filteredContacts.map(c => [
      c.id, 
      `"${(c.name || '').replace(/"/g, '""')}"`, 
      `"${(c.designation || '').replace(/"/g, '""')}"`, 
      `"${(c.client || '').replace(/"/g, '""')}"`, 
      `"${c.phone || ''}"`, 
      `"${c.email || ''}"`
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TaxPro_Contact_Persons_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    if (onShowToast) onShowToast('Contact Persons directory CSV downloaded!', 'success');
  };

  const filteredContacts = contacts.filter(c => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.client && c.client.toLowerCase().includes(term)) ||
      (c.designation && c.designation.toLowerCase().includes(term)) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term))
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f3f4f6] min-h-screen text-gray-800 relative printable-area-container">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold font-outfit text-[#1e1e2d]">Contact Persons</h1>
          <p className="text-xs text-gray-500 mt-1">Authorized client representatives, key managerial personnel, and signatories.</p>
        </div>
        
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button 
            onClick={handlePrintContactDirectory}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-xs"
            title="Print Contact Persons Register"
          >
            <Printer className="w-4 h-4 text-indigo-600" /> <span className="hidden sm:inline">Print Directory</span>
          </button>
          
          <button 
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-xs"
            title="Export Contact Persons to CSV"
          >
            <Download className="w-4 h-4 text-emerald-600" /> <span className="hidden sm:inline">Download CSV</span>
          </button>

          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#5b52e0] hover:bg-[#4c44cf] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add New Contact
          </button>
        </div>
      </div>

      {/* Control / Search Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-4 mb-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
          <Users className="w-4 h-4 text-indigo-600" />
          <span>Total Contacts: <span className="text-[#5b52e0] font-black">{filteredContacts.length}</span></span>
        </div>

        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search Contact Name, Client Company, Designation, Phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:bg-white focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Screen Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 print:hidden">
        {filteredContacts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 font-bold bg-white rounded-2xl border border-gray-200 border-dashed">
            No contact persons found matching your criteria.
          </div>
        ) : (
          filteredContacts.map((c) => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs hover:shadow-lg transition-all relative smooth-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-sm text-indigo-700 shadow-2xs">
                    {c.name.split(' ').map(n=>n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 overflow-hidden pr-14">
                    <h3 className="font-outfit font-extrabold text-gray-900 text-base truncate">{c.name}</h3>
                    <span className="text-[11px] text-indigo-600 font-bold truncate block">{c.designation}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 text-xs border-t border-gray-100 pt-4">
                  <span className="text-gray-700 flex items-center gap-2.5 font-bold truncate">
                    <Building className="w-4 h-4 text-indigo-500 shrink-0" /> {c.client}
                  </span>
                  <span className="text-gray-600 flex items-center gap-2.5 font-medium truncate">
                    <Mail className="w-4 h-4 text-gray-400 shrink-0" /> {c.email}
                  </span>
                  <span className="text-gray-600 flex items-center gap-2.5 font-medium truncate">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" /> +91 {c.phone}
                  </span>
                </div>
              </div>
              
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                 <button 
                   onClick={() => startEditContact(c)}
                   className="p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors cursor-pointer"
                   title="Edit Contact Person"
                 >
                   <Edit2 className="w-4 h-4" />
                 </button>
                 <button 
                   onClick={() => setDeleteId(c.id)}
                   className="p-1.5 text-gray-300 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-colors cursor-pointer"
                   title="Remove Contact"
                 >
                   <Trash2 className="w-4 h-4" />
                 </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* EDIT CONTACT MODAL */}
      {editingContact && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setEditingContact(null); }}
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-slate-900 tracking-tight">
                    Edit Contact Person
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update representative profile, designation & contact details
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setEditingContact(null)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditContactSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold overscroll-contain chat-custom-scrollbar">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-slate-700 block mb-1">Full Name <span className="text-rose-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    value={editingContact.name || ''} 
                    onChange={e => setEditingContact({...editingContact, name: e.target.value})} 
                    className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:border-indigo-600 text-xs shadow-2xs font-semibold" 
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">Designation / Role</label>
                  <input 
                    type="text" 
                    value={editingContact.designation || ''} 
                    onChange={e => setEditingContact({...editingContact, designation: e.target.value})} 
                    className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:border-indigo-600 text-xs shadow-2xs" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-slate-700 block mb-1">Phone Number <span className="text-rose-500">*</span> (10 Digits)</label>
                  <input 
                    type="tel" 
                    required 
                    maxLength="10" 
                    value={editingContact.phone || ''} 
                    onChange={e => setEditingContact({...editingContact, phone: e.target.value.replace(/[^0-9]/g, '')})} 
                    className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none font-mono focus:border-indigo-600 text-xs shadow-2xs" 
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">Email Address <span className="text-rose-500">*</span></label>
                  <input 
                    type="email" 
                    required 
                    value={editingContact.email || ''} 
                    onChange={e => setEditingContact({...editingContact, email: e.target.value})} 
                    className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:border-indigo-600 text-xs shadow-2xs" 
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 block mb-1">Associated Client / Company <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  required 
                  value={editingContact.client || ''} 
                  onChange={e => setEditingContact({...editingContact, client: e.target.value})} 
                  list="client-edit-options-list"
                  className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:border-indigo-600 text-xs shadow-2xs" 
                />
                <datalist id="client-edit-options-list">
                  {clientOptions.map((opt, i) => (
                    <option key={i} value={opt} />
                  ))}
                </datalist>
              </div>

              {/* Bottom Sticky Actions */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 -mx-6 -mb-6 mt-3">
                <button 
                  type="button" 
                  onClick={() => setEditingContact(null)} 
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* NEW CONTACT MODAL */}
      {isAddModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddModalOpen(false); }}
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-slate-900 tracking-tight">
                    Add Contact Person
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Authorized client representative & corporate point-of-contact
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setIsAddModalOpen(false)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="contact-add-form" onSubmit={handleAddContactSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold overscroll-contain chat-custom-scrollbar">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-slate-700 block mb-1">Full Name <span className="text-rose-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Rahul Sharma" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:border-indigo-600 text-xs shadow-2xs font-semibold" 
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">Designation / Role</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Managing Director / Finance Head" 
                    value={formData.desc} 
                    onChange={e => setFormData({...formData, desc: e.target.value})} 
                    className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:border-indigo-600 text-xs shadow-2xs" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-slate-700 block mb-1">Phone Number <span className="text-rose-500">*</span> (10 Digits)</label>
                  <input 
                    type="tel" 
                    required 
                    maxLength="10" 
                    placeholder="9876543210" 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value.replace(/[^0-9]/g, '')})} 
                    className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none font-mono focus:border-indigo-600 text-xs shadow-2xs" 
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">Email Address <span className="text-rose-500">*</span></label>
                  <input 
                    type="email" 
                    required 
                    placeholder="name@company.com" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:border-indigo-600 text-xs shadow-2xs" 
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 block mb-1">Associated Client / Company <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Acme Corp Private Limited" 
                  value={formData.client} 
                  onChange={e => setFormData({...formData, client: e.target.value})} 
                  list="client-options-list"
                  className="w-full bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:border-indigo-600 text-xs shadow-2xs" 
                />
                <datalist id="client-options-list">
                  {clientOptions.map((opt, i) => (
                    <option key={i} value={opt} />
                  ))}
                </datalist>
              </div>

              {/* Bottom Sticky Actions */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 -mx-6 -mb-6 mt-3">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  Add Contact
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteId && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteId(null); }}
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 text-center my-auto animate-modal-smooth">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-rose-100 text-rose-600 shadow-2xs">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1 font-outfit">Delete Contact Person</h3>
            <p className="text-xs text-slate-500 mb-5 font-medium leading-relaxed">Are you sure you want to permanently remove this contact? This action cannot be undone.</p>
            <div className="flex gap-2.5">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2 rounded-xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">Cancel</button>
              <button onClick={executeDelete} className="flex-1 py-2 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition-colors cursor-pointer active:scale-95">Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
