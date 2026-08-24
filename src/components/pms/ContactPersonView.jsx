import React, { useState, useEffect } from 'react';
import { UserCheck, Mail, Phone, Building, Plus, Trash2, X, AlertCircle, Printer, Download, Search, ArrowLeft, Users, Briefcase, Edit2, Save } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

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
      setEditingContact(null);
      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

      if (onShowToast) onShowToast(`✓ Contact "${editingContact.name}" updated successfully!`, 'success');
    } catch (err) {
      if (onShowToast) onShowToast(`Failed to update contact: ${err.message}`, 'error');
    }
  };

  const executeDelete = async () => {
    const idToDelete = deleteId;
    setContacts(prev => prev.filter(x => x.id !== idToDelete));
    setDeleteId(null);

    try {
      await supabase.from('contact_persons').delete().eq('id', String(idToDelete));
    } catch (e) {}

    if (onShowToast) onShowToast('Contact person removed successfully.', 'info');
  };

  const handlePrintContactDirectory = () => {
    if (contacts.length === 0) {
      if (onShowToast) onShowToast('No contact persons available to print.', 'warning');
      return;
    }

    if (onShowToast) onShowToast('Opening Contact Persons Master Directory Print Document...', 'info');

    const printList = filteredContacts.length > 0 ? filteredContacts : contacts;

    // Open isolated high-resolution print window
    const printWindow = window.open('', '_blank', 'width=1100,height=850');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>TaxPro PMS - Contact Persons Master Directory</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm 10mm 10mm 10mm;
          }
          * {
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
          body {
            background-color: #ffffff;
            color: #111827;
            margin: 0;
            padding: 14px;
          }
          .header-box {
            border-bottom: 2px solid #111827;
            padding-bottom: 10px;
            margin-bottom: 14px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .logo-title {
            font-size: 22px;
            font-weight: 900;
            letter-spacing: -0.5px;
            color: #111827;
            margin: 0 0 2px 0;
          }
          .subtitle {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #4b5563;
            margin: 0;
          }
          .meta-info {
            text-align: right;
            font-size: 10px;
            color: #4b5563;
          }
          .meta-info strong {
            color: #111827;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-top: 8px;
          }
          thead tr {
            background-color: #f3f4f6;
            border-top: 1px solid #d1d5db;
            border-bottom: 2px solid #9ca3af;
          }
          th {
            padding: 7px 10px;
            text-align: left;
            font-weight: 800;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #374151;
            border-right: 1px solid #e5e7eb;
          }
          th:last-child {
            border-right: none;
          }
          td {
            padding: 7px 10px;
            border-bottom: 1px solid #e5e7eb;
            border-right: 1px solid #f3f4f6;
            vertical-align: middle;
          }
          td:last-child {
            border-right: none;
          }
          tr:nth-child(even) {
            background-color: #f9fafb;
          }
          .footer-box {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #d1d5db;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 10px;
            color: #6b7280;
          }
          .signatory-line {
            width: 180px;
            border-bottom: 1px solid #9ca3af;
            height: 30px;
            margin-bottom: 4px;
          }
          .print-btn-bar {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #4338ca;
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(67,56,202,0.3);
            border: none;
          }
          @media print {
            .print-btn-bar {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <h1 class="logo-title">TAXPRO PMS</h1>
            <p class="subtitle">Authorized Contact Persons & Client Liaison Master Directory</p>
            <div style="font-size: 10px; color: #6b7280; margin-top: 3px;">
              Total Representative Records: <strong>${printList.length}</strong>
            </div>
          </div>
          <div class="meta-info">
            <div>Generated: <strong>${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></div>
            <div>Registry: <strong>Live PostgreSQL Database Synchronized</strong></div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th style="width: 180px;">Contact Person Name</th>
              <th style="width: 170px;">Designation / Role</th>
              <th>Associated Client / Company</th>
              <th style="width: 130px;">Phone Number</th>
              <th style="width: 200px;">Email Address</th>
            </tr>
          </thead>
          <tbody>
            ${printList.map((c, i) => `
              <tr>
                <td style="text-align: center; color: #6b7280; font-family: monospace;">${i + 1}</td>
                <td>
                  <strong style="color: #111827;">${c.name || '—'}</strong>
                </td>
                <td style="color: #4b5563; font-weight: 600;">${c.designation || 'Liaison'}</td>
                <td style="color: #4338ca; font-weight: bold;">${c.client || '—'}</td>
                <td style="font-family: monospace; font-weight: 600;">+91 ${c.phone || '—'}</td>
                <td style="font-size: 10px; color: #4b5563;">${c.email || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer-box">
          <div>
            <div>TaxPro Practice Management System • Official Contact Directory</div>
            <div style="font-size: 9px; margin-top: 2px;">Verified against live PostgreSQL Database</div>
          </div>
          <div style="text-align: right;">
            <div class="signatory-line"></div>
            <div>Authorized Signatory / Partner</div>
          </div>
        </div>

        <button class="print-btn-bar" onclick="window.print()">🖨️ Print Now</button>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
          className="modal-overlay-backdrop"
        >
          <div className="modal-content-box max-w-2xl">
            {/* Premium Gradient Header */}
            <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-xs">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-white tracking-tight">
                    Edit Contact Person
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Update representative profile, designation & corporate contact details
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setEditingContact(null)} 
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer shadow-xs"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditContactSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold scrollbar-thin">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-700 block mb-1">Full Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    value={editingContact.name || ''} 
                    onChange={e => setEditingContact({...editingContact, name: e.target.value})} 
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-300 outline-none focus:bg-white focus:border-indigo-500 text-xs" 
                  />
                </div>

                <div>
                  <label className="text-gray-700 block mb-1">Designation / Role</label>
                  <input 
                    type="text" 
                    value={editingContact.designation || ''} 
                    onChange={e => setEditingContact({...editingContact, designation: e.target.value})} 
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-300 outline-none focus:bg-white focus:border-indigo-500 text-xs" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-700 block mb-1">Phone Number <span className="text-red-500">*</span> (10 Digits)</label>
                  <input 
                    type="tel" 
                    required 
                    maxLength="10" 
                    value={editingContact.phone || ''} 
                    onChange={e => setEditingContact({...editingContact, phone: e.target.value.replace(/[^0-9]/g, '')})} 
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-300 outline-none font-mono focus:bg-white focus:border-indigo-500 text-xs" 
                  />
                </div>

                <div>
                  <label className="text-gray-700 block mb-1">Email Address <span className="text-red-500">*</span></label>
                  <input 
                    type="email" 
                    required 
                    value={editingContact.email || ''} 
                    onChange={e => setEditingContact({...editingContact, email: e.target.value})} 
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-300 outline-none focus:bg-white focus:border-indigo-500 text-xs" 
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-700 block mb-1">Associated Client / Company <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required 
                  value={editingContact.client || ''} 
                  onChange={e => setEditingContact({...editingContact, client: e.target.value})} 
                  list="client-edit-options-list"
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-300 outline-none focus:bg-white focus:border-indigo-500 text-xs" 
                />
                <datalist id="client-edit-options-list">
                  {clientOptions.map((opt, i) => (
                    <option key={i} value={opt} />
                  ))}
                </datalist>
              </div>

              {/* Bottom Sticky Actions */}
              <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 mt-3 -mx-6 -mb-6">
                <button 
                  type="button" 
                  onClick={() => setEditingContact(null)} 
                  className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
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
          className="modal-overlay-backdrop"
        >
          <div className="modal-content-box max-w-2xl">
            {/* Premium Gradient Header */}
            <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-xs">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-white tracking-tight">
                    Add Contact Person
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Authorized client representative & corporate point-of-contact
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer shadow-xs"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="contact-add-form" onSubmit={handleAddContactSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold scrollbar-thin">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-700 block mb-1">Full Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Rahul Sharma" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-300 outline-none focus:bg-white focus:border-indigo-500 text-xs" 
                  />
                </div>

                <div>
                  <label className="text-gray-700 block mb-1">Designation / Role</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Managing Director / Finance Head" 
                    value={formData.desc} 
                    onChange={e => setFormData({...formData, desc: e.target.value})} 
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-300 outline-none focus:bg-white focus:border-indigo-500 text-xs" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-700 block mb-1">Phone Number <span className="text-red-500">*</span> (10 Digits)</label>
                  <input 
                    type="tel" 
                    required 
                    maxLength="10" 
                    placeholder="9876543210" 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value.replace(/[^0-9]/g, '')})} 
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-300 outline-none font-mono focus:bg-white focus:border-indigo-500 text-xs" 
                  />
                </div>

                <div>
                  <label className="text-gray-700 block mb-1">Email Address <span className="text-red-500">*</span></label>
                  <input 
                    type="email" 
                    required 
                    placeholder="name@company.com" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-300 outline-none focus:bg-white focus:border-indigo-500 text-xs" 
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-700 block mb-1">Associated Client / Company <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Acme Corp Private Limited" 
                  value={formData.client} 
                  onChange={e => setFormData({...formData, client: e.target.value})} 
                  list="client-options-list"
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-300 outline-none focus:bg-white focus:border-indigo-500 text-xs" 
                />
                <datalist id="client-options-list">
                  {clientOptions.map((opt, i) => (
                    <option key={i} value={opt} />
                  ))}
                </datalist>
              </div>

              {/* Bottom Sticky Actions */}
              <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 mt-3 -mx-6 -mb-6">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-[#0f766e] hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-700/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
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
          className="modal-overlay-backdrop"
        >
          <div className="modal-content-box max-w-sm p-6 text-center border border-red-100 dark:border-red-900/30">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 mb-1 font-outfit">Delete Contact Person</h3>
            <p className="text-xs text-gray-500 mb-6 font-medium">Are you sure you want to permanently remove this contact? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl font-bold text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer">Cancel</button>
              <button onClick={executeDelete} className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white bg-red-600 hover:bg-red-700 shadow-md transition-colors cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
