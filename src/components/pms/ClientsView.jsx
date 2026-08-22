import React, { useState, useEffect } from 'react';
import { Plus, Search, Users, Mail, Phone, FileText, CheckCircle, X, Download, Trash2, Printer, History, Archive, MapPin, Edit2, Save, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function ClientsView({ onShowToast }) {
  const [activeTab, setActiveTab] = useState('Active');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeClientStat, setActiveClientStat] = useState(null);
  const [undoInfo, setUndoInfo] = useState(null);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [clientEditForm, setClientEditForm] = useState(null);

  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(c => ({
          ...c,
          tradeName: c.trade_name,
          fileNo: c.file_no,
          attachedDoc: c.attached_doc,
          paymentHistory: c.payment_history,
          address: c.client_address || '',
          createdAt: c.created_at
        }));
        setClients(mapped);
        localStorage.setItem('taxpro_cached_clients', JSON.stringify(mapped));
      } else {
        const cached = localStorage.getItem('taxpro_cached_clients');
        if (cached) setClients(JSON.parse(cached));
      }
    } catch (e) {
      console.warn('[Clients Load Notice]:', e.message);
      const cached = localStorage.getItem('taxpro_cached_clients');
      if (cached) setClients(JSON.parse(cached));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchClients();

    const handleOpenAdd = () => setIsAddModalOpen(true);
    const handleClientAdded = () => fetchClients();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setActiveClientStat(null);
        setIsEditingClient(false);
      }
    };

    window.addEventListener('ai_open_add_client', handleOpenAdd);
    window.addEventListener('ai_client_added', handleClientAdded);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('ai_open_add_client', handleOpenAdd);
      window.removeEventListener('ai_client_added', handleClientAdded);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const [newClient, setNewClient] = useState({
    name: '', tradeName: '', pan: '', gst: '', fileNo: '', email: '', phone: '', attachedDocName: '', address: ''
  });

  const handleAddClient = async (e) => {
    e.preventDefault();
    if (!newClient.name) return;

    const clientId = `CL-${Math.floor(500 + Math.random() * 500)}`;
    const finalTradeName = newClient.tradeName || newClient.name;
    const finalPan = newClient.pan || 'ABCDE1234F';
    const finalGst = newClient.gst || '27ABCDE1234F1Z5';
    const finalFileNo = newClient.fileNo || `FN-${Math.floor(900 + Math.random() * 100)}`;
    const finalEmail = newClient.email || 'client@finexo.in';
    const finalPhone = newClient.phone || '+91 98000 00000';
    const finalDoc = newClient.attachedDocName || null;

    const { data: dbData, error: dbError } = await supabase.from('clients').insert([{
      name: newClient.name,
      trade_name: finalTradeName,
      pan: finalPan,
      gst: finalGst,
      file_no: finalFileNo,
      email: finalEmail,
      phone: finalPhone,
      client_address: newClient.address || '',
      attached_doc: finalDoc,
      status: 'Active',
      payment_history: []
    }]).select();

    if (dbError) {
      if (onShowToast) onShowToast(`Failed to add client: ${dbError.message}`, 'error');
      return;
    }

    const insertedClient = dbData[0];
    const newClientObj = {
      ...insertedClient,
      tradeName: insertedClient.trade_name,
      fileNo: insertedClient.file_no,
      attachedDoc: insertedClient.attached_doc,
      paymentHistory: insertedClient.payment_history,
      address: insertedClient.client_address || '',
      createdAt: insertedClient.created_at
    };

    setClients(prev => [newClientObj, ...prev]);
    setIsAddModalOpen(false);
    setNewClient({ name: '', tradeName: '', pan: '', gst: '', fileNo: '', email: '', phone: '', attachedDocName: '', address: '' });

    if (undoInfo) clearTimeout(undoInfo.timer);

    const timerId = setTimeout(() => {
       setUndoInfo(null);
    }, 5000);

    setUndoInfo({ id: newClientObj.id, name: newClientObj.name, timer: timerId });
  };

  const handleUndoAdd = async () => {
     if (undoInfo) {
        clearTimeout(undoInfo.timer);
        await supabase.from('clients').delete().eq('id', undoInfo.id);
        setClients(prev => prev.filter(c => c.id !== undoInfo.id));
        setUndoInfo(null);
        if (onShowToast) onShowToast('Client addition undone successfully.', 'info');
     }
  };

  const deleteClient = async (e, id) => {
    e.stopPropagation();
    if(window.confirm('Are you absolutely sure you want to permanently delete this client? This cannot be undone.')) {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) {
        if (onShowToast) onShowToast(`Error deleting: ${error.message}`, 'error');
        return;
      }
      setClients(clients.filter(c => c.id !== id));
      setActiveClientStat(null);
      if(onShowToast) onShowToast('Client profile permanently deleted.', 'info');
    }
  };

  const isClientArchived = (status) => {
    return status === 'Archived' || status === 'Old Client' || status === 'Old' || status === 'Inactive';
  };

  const toggleArchiveStatus = async (e, id) => {
    if (e) e.stopPropagation();
    
    const client = clients.find(c => c.id === id);
    if (!client) return;
    
    const isCurrentlyArchived = isClientArchived(client.status);
    const nextStatus = isCurrentlyArchived ? 'Active' : 'Archived';
    
    try {
      const { error } = await supabase.from('clients').update({ status: nextStatus }).eq('id', id);
      if (error) {
         if (onShowToast) onShowToast(`Failed to update status: ${error.message}`, 'error');
         return;
      }
    } catch (err) {
      console.error('[Archive Error]:', err);
    }

    setClients(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, status: nextStatus };
      }
      return c;
    }));

    if (activeClientStat && activeClientStat.id === id) {
      setActiveClientStat(prev => prev ? { ...prev, status: nextStatus } : null);
    }

    if (onShowToast) {
      onShowToast(
        nextStatus === 'Archived' 
          ? `Client "${client.name}" moved to Archive.` 
          : `Client "${client.name}" restored to Active Directory!`,
        'success'
      );
    }
  };

  const updateClientDoc = async (id, fileName) => {
    const { error } = await supabase.from('clients').update({ attached_doc: fileName }).eq('id', id);
    if (!error) {
      setClients(clients.map(c => {
        if (c.id === id) {
          if(activeClientStat && activeClientStat.id === id) {
             setActiveClientStat({ ...c, attachedDoc: fileName });
          }
          return { ...c, attachedDoc: fileName };
        }
        return c;
      }));
      if (onShowToast) onShowToast('Client related file properly updated and linked.', 'success');
    }
  };

  const startEditClient = () => {
    setClientEditForm(activeClientStat);
    setIsEditingClient(true);
  };

  const saveEditClient = async () => {
    const { error } = await supabase.from('clients').update({
       name: clientEditForm.name,
       trade_name: clientEditForm.tradeName,
       pan: clientEditForm.pan,
       gst: clientEditForm.gst,
       file_no: clientEditForm.fileNo,
       email: clientEditForm.email,
       phone: clientEditForm.phone,
       client_address: clientEditForm.address || ''
    }).eq('id', clientEditForm.id);

    if (error) {
       if (onShowToast) onShowToast(`Error editing: ${error.message}`, 'error');
       return;
    }

    setClients(clients.map(c => c.id === clientEditForm.id ? { ...c, ...clientEditForm } : c));
    setActiveClientStat(clientEditForm);
    setIsEditingClient(false);
    if(onShowToast) onShowToast('Client profile updated successfully!', 'success');
  };

  const triggerPrint = () => {
    if (onShowToast) onShowToast('Generating printable client ledger...', 'info');
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const handleDownloadCSV = () => {
    if (clients.length === 0) {
      if (onShowToast) onShowToast('No clients available to export.', 'warning');
      return;
    }
    const headers = ['Client ID', 'Name', 'Trade Name', 'File No', 'PAN', 'GSTIN', 'Email', 'Phone', 'Status', 'Address', 'Attached Doc'];
    const rows = clients.map(c => [
      c.id, 
      `"${(c.name || '').replace(/"/g, '""')}"`, 
      `"${(c.tradeName || '').replace(/"/g, '""')}"`, 
      `"${c.fileNo || ''}"`, 
      `"${c.pan || ''}"`, 
      `"${c.gst || ''}"`, 
      `"${c.email || ''}"`, 
      `"${c.phone || ''}"`, 
      `"${c.status || 'Active'}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      `"${c.attachedDoc || ''}"`
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TaxPro_Client_Directory_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    if (onShowToast) onShowToast('Client directory CSV downloaded successfully!', 'success');
  };

  const activeClientsCount = clients.filter(c => !isClientArchived(c.status)).length;
  const archivedClientsCount = clients.filter(c => isClientArchived(c.status)).length;

  const filteredClients = clients.filter(c => {
    const isArchived = isClientArchived(c.status);
    if (activeTab === 'Active' && isArchived) return false;
    if (activeTab === 'Archived' && !isArchived) return false;
    
    if (searchQuery) {
       const term = searchQuery.toLowerCase();
       return (
         (c.name && c.name.toLowerCase().includes(term)) || 
         (c.tradeName && c.tradeName.toLowerCase().includes(term)) || 
         (c.fileNo && c.fileNo.toLowerCase().includes(term)) || 
         (c.pan && c.pan.toLowerCase().includes(term)) ||
         (c.email && c.email.toLowerCase().includes(term)) ||
         (c.phone && c.phone.toLowerCase().includes(term))
       );
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f3f4f6] min-h-screen text-gray-800 relative printable-area-container">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold font-outfit text-[#1e1e2d]">Client Directory</h1>
          <p className="text-xs text-gray-500 mt-1">Manage firm client profiles, compliance tracking, and archives.</p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto print:hidden">
          <button 
            onClick={triggerPrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4 text-indigo-600" /> <span className="hidden sm:inline">Print Directory</span>
          </button>
          
          <button 
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-emerald-600" /> <span className="hidden sm:inline">Download CSV</span>
          </button>
          
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5b52e0] hover:bg-[#4c44cf] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add New Client
          </button>
        </div>
      </div>

      {/* Control Bar: Tabs & Search */}
      <div className="bg-white border border-gray-200 rounded-2xl p-2 sm:p-4 mb-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden print-hidden">
        
        <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('Active')}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'Active' ? 'bg-white text-[#5b52e0] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>Active Clients</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === 'Active' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-200 text-gray-600'}`}>
              {activeClientsCount}
            </span>
          </button>
          
          <button 
            onClick={() => setActiveTab('Archived')}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'Archived' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archived</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === 'Archived' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-600'}`}>
              {archivedClientsCount}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('All')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'All' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>All</span>
            <span className="text-[10px] font-bold text-gray-400">({clients.length})</span>
          </button>
        </div>

        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search Name, Trade Name, File No, Phone, PAN..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:bg-white focus:border-indigo-500"
          />
        </div>
      </div>

      {/* MASTER CLIENT DIRECTORY PRINTABLE REGISTER (Visible ONLY in print when no single client modal is active) */}
      <div className={`hidden ${activeClientStat ? 'print:hidden' : 'print:block'} client-directory-print-table bg-white text-gray-900`}>
        {/* Official Letterhead */}
        <div className="border-b-2 border-gray-900 pb-4 mb-5 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 font-outfit uppercase">TAXPRO PMS</h1>
            <p className="text-xs text-gray-700 font-bold uppercase tracking-wider">Client Master Directory & Compliance Register</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Filter Scope: {activeTab} Clients ({filteredClients.length} Records)</p>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-gray-900">Generated: {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            <div className="text-[10px] text-gray-600 font-medium">Total Active: {clients.filter(c => c.status === 'Active').length} • Old: {clients.filter(c => c.status === 'Old Client').length}</div>
          </div>
        </div>

        {/* Clean High-Density A4 Print Table */}
        <table className="w-full text-left text-xs border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300 font-bold text-gray-900 uppercase text-[10px] tracking-wider">
              <th className="py-2 px-2 border-r border-gray-300 text-center w-8">#</th>
              <th className="py-2 px-2.5 border-r border-gray-300 w-20">File No</th>
              <th className="py-2 px-3 border-r border-gray-300">Client Name & Trade Name</th>
              <th className="py-2 px-2.5 border-r border-gray-300 w-24">PAN / GSTIN</th>
              <th className="py-2 px-3 border-r border-gray-300">Contact & Email</th>
              <th className="py-2 px-2 border-r border-gray-300 text-center w-16">Status</th>
              <th className="py-2 px-3">Registered Address</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((c, index) => (
              <tr key={c.id || index} className="border-b border-gray-200 text-[11px]">
                <td className="py-2 px-2 border-r border-gray-200 text-center font-mono text-gray-500">{index + 1}</td>
                <td className="py-2 px-2.5 border-r border-gray-200 font-mono font-bold text-gray-900">{c.fileNo}</td>
                <td className="py-2 px-3 border-r border-gray-200 font-bold text-gray-900">
                  <div>{c.name}</div>
                  {c.tradeName && c.tradeName !== c.name && (
                    <div className="text-[10px] text-gray-600 font-normal">T/A: {c.tradeName}</div>
                  )}
                </td>
                <td className="py-2 px-2.5 border-r border-gray-200 font-mono text-gray-700">
                  <div>{c.pan}</div>
                  {c.gst && <div className="text-[9px] text-gray-500">{c.gst}</div>}
                </td>
                <td className="py-2 px-3 border-r border-gray-200 text-gray-700">
                  <div>{c.phone}</div>
                  <div className="text-[10px] text-gray-500">{c.email}</div>
                </td>
                <td className="py-2 px-2 border-r border-gray-200 text-center">
                  <span className="font-bold text-[9px] uppercase px-1.5 py-0.5 border border-gray-400 rounded">
                    {c.status}
                  </span>
                </td>
                <td className="py-2 px-3 text-gray-600 text-[10px]">
                  {c.address || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signatory Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 flex justify-between items-end text-[10px] text-gray-500">
          <div>
            <span>TaxPro Practice Management System • Confidential Master Record</span>
          </div>
          <div className="text-right">
            <div className="h-10 border-b border-gray-400 w-48 mb-1"></div>
            <span>Authorized Signatory</span>
          </div>
        </div>
      </div>

      {/* Client List Grid view */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 print:hidden print-hidden">
        {filteredClients.length === 0 ? (
           <div className="col-span-full py-12 text-center text-gray-400 font-bold bg-white rounded-2xl border border-gray-200 border-dashed">
             No clients found in this category.
           </div>
        ) : (
          filteredClients.map((c) => (
            <div 
              key={c.id} 
              onClick={() => setActiveClientStat(c)}
              className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer relative group flex flex-col h-full smooth-card"
            >
               
               <div className="flex items-start justify-between gap-4 mb-4">
                 <div>
                   <h3 className="font-outfit font-extrabold text-lg text-gray-900 leading-tight mb-1 group-hover:text-[#5b52e0] transition-colors">{c.name}</h3>
                   <div className="text-xs font-bold text-gray-500">{c.tradeName}</div>
                 </div>
                 <div className="flex flex-col items-end gap-1.5">
                   <span className={`px-2 py-1 rounded text-[9px] uppercase tracking-widest font-black shrink-0 ${
                     c.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                   }`}>
                     {c.status}
                   </span>
                   <div className="text-[9px] font-bold text-gray-400">Joined: {new Date(c.createdAt).toLocaleDateString()}</div>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-3 mb-5 border-t border-b border-gray-100 py-3">
                 <div>
                   <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">File No</div>
                   <div className="font-mono font-bold text-indigo-700 text-sm">{c.fileNo}</div>
                 </div>
                 <div>
                   <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PAN Info</div>
                   <div className="font-mono font-bold text-gray-700 text-sm">{c.pan}</div>
                 </div>
               </div>

               <div className="mt-auto space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                    <Mail className="w-3.5 h-3.5 text-gray-400" /> {c.email}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-gray-400" /> {c.phone}
                  </div>
               </div>

               {/* Hover Quick Actions */}
               <div className="absolute bottom-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => deleteClient(e, c.id)}
                    className="p-1.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-colors border border-rose-100 cursor-pointer"
                    title="Delete Client"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => toggleArchiveStatus(e, c.id)}
                    className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded-lg transition-colors border border-amber-100 cursor-pointer"
                    title={isClientArchived(c.status) ? 'Restore to Active Directory' : 'Move to Archive'}
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
               </div>

            </div>
          ))
        )}
      </div>

      {/* Add Client Modal */}
      {isAddModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddModalOpen(false); }}
          className="modal-overlay-backdrop"
        >
          <div className="modal-content-box max-w-3xl">
            
            {/* Premium Gradient Header */}
            <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-white tracking-tight">
                    Register New Client
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Add verified corporate profile & tax credentials to master directory
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
            
            {/* 2-Column Responsive Form Body */}
            <form onSubmit={handleAddClient} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold scrollbar-thin">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Column 1: Identity & Communication */}
                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className="text-gray-700 block mb-1">Legal Client Name <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      placeholder="e.g. Acme Corp Private Limited" 
                      autoFocus 
                      value={newClient.name} 
                      onChange={e => setNewClient({...newClient, name: e.target.value})} 
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 text-xs" 
                      required 
                    />
                  </div>

                  <div>
                    <label className="text-gray-700 block mb-1">Trade Name (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Acme Financials" 
                      value={newClient.tradeName} 
                      onChange={e => setNewClient({...newClient, tradeName: e.target.value})} 
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 text-xs" 
                    />
                  </div>

                  <div>
                    <label className="text-gray-700 block mb-1">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="client@acme.com" 
                      value={newClient.email} 
                      onChange={e => setNewClient({...newClient, email: e.target.value})} 
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 text-xs" 
                    />
                  </div>

                  <div>
                    <label className="text-gray-700 block mb-1">Client Business Address</label>
                    <textarea 
                      rows="3" 
                      placeholder="e.g. 123 Business Suite, Commerce City, Gujarat - 380001" 
                      value={newClient.address} 
                      onChange={e => setNewClient({...newClient, address: e.target.value})} 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 min-h-[75px] text-xs resize-none" 
                    />
                  </div>
                </div>

                {/* Column 2: Tax Credentials, IDs & Documents */}
                <div className="flex flex-col gap-3.5">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-700 block mb-1">PAN Number</label>
                      <input 
                        type="text" 
                        placeholder="ABCDE1234F" 
                        value={newClient.pan} 
                        onChange={e => setNewClient({...newClient, pan: e.target.value.toUpperCase()})} 
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-mono text-xs" 
                      />
                    </div>
                    <div>
                      <label className="text-gray-700 block mb-1">GSTIN</label>
                      <input 
                        type="text" 
                        placeholder="27ABCDE1234F1Z5" 
                        value={newClient.gst} 
                        onChange={e => setNewClient({...newClient, gst: e.target.value.toUpperCase()})} 
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-mono text-xs" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-700 block mb-1">Mobile / Phone</label>
                      <input 
                        type="text" 
                        placeholder="+91 98000 00000" 
                        value={newClient.phone} 
                        onChange={e => setNewClient({...newClient, phone: e.target.value})} 
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-mono text-xs" 
                      />
                    </div>
                    <div>
                      <label className="text-gray-700 block mb-1">File No / Cust ID</label>
                      <input 
                        type="text" 
                        placeholder="FN-100" 
                        value={newClient.fileNo} 
                        onChange={e => setNewClient({...newClient, fileNo: e.target.value})} 
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-mono text-xs" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-700 block mb-1">KYC / Registration Document (Optional)</label>
                    <div className="border border-dashed border-gray-300 rounded-xl p-3 bg-gray-50 hover:bg-gray-100/80 transition-colors">
                      <input 
                        type="file" 
                        onChange={e => setNewClient({...newClient, attachedDocName: e.target.files[0]?.name || ''})} 
                        className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" 
                      />
                      {newClient.attachedDocName && (
                        <p className="text-[11px] text-emerald-700 font-bold mt-1">
                          ✓ Selected: {newClient.attachedDocName}
                        </p>
                      )}
                    </div>
                  </div>

                </div>

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
                  Save Client
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* DETAILED STATS & PRINT MODAL */}
      {activeClientStat && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) { setActiveClientStat(null); setIsEditingClient(false); } }}
          className="modal-overlay-backdrop print:bg-transparent print:static print:p-0"
        >
          <div className="modal-content-box max-w-2xl p-6 md:p-8 client-print-document print:border-none print:shadow-none print:max-w-full scrollbar-thin print:p-0 print:m-0">
            
            {/* Print Letterhead Header (Visible ONLY during print) */}
            <div className="hidden print:block border-b-2 border-gray-900 pb-3 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-gray-900 font-outfit uppercase">TAXPRO PMS</h1>
                  <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider">Official Client Master Record & Compliance Summary</p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-gray-900">Generated: {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  <div className="text-[10px] font-mono text-gray-500">Status: {activeClientStat.status}</div>
                </div>
              </div>
            </div>

            {/* Top Close & Back Controls */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 print:hidden">
              <button 
                type="button" 
                onClick={() => { setActiveClientStat(null); setIsEditingClient(false); }}
                className="p-2 rounded-xl bg-gray-50 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-colors flex items-center gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
                title="Go Back"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Directory</span>
              </button>

              <button 
                onClick={() => { setActiveClientStat(null); setIsEditingClient(false); }} 
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 print:text-gray-600">
                   <Users className="w-3.5 h-3.5 print:hidden" /> Client Master Account
                </div>
                {isEditingClient ? (
                  <div className="space-y-2 mb-2 w-full max-w-xs">
                    <input type="text" value={clientEditForm.name} onChange={e => setClientEditForm({...clientEditForm, name: e.target.value})} className="text-2xl font-extrabold text-[#1e1e2d] font-outfit leading-tight w-full outline-none border-b-2 border-indigo-500 bg-gray-50 px-1 py-0.5 rounded-t" placeholder="Client Name" />
                    <input type="text" value={clientEditForm.tradeName} onChange={e => setClientEditForm({...clientEditForm, tradeName: e.target.value})} className="text-sm font-bold text-gray-500 w-full outline-none border-b-2 border-indigo-500 bg-gray-50 px-1 py-0.5 rounded-t" placeholder="Trade Name" />
                  </div>
                ) : (
                  <>
                    <h3 className="text-2xl font-extrabold text-[#1e1e2d] font-outfit leading-tight mb-1 print:text-black">
                      {activeClientStat.name}
                    </h3>
                    <div className="text-sm font-bold text-gray-500 mb-2">T/A: {activeClientStat.tradeName}</div>
                  </>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                    activeClientStat.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 print:bg-transparent print:border-gray-400 print:text-gray-900' : 'bg-amber-50 text-amber-700 border-amber-200 print:bg-transparent print:border-gray-400 print:text-gray-900'
                  }`}>
                    {activeClientStat.status}
                  </span>
                  <span className="text-xs font-bold text-gray-500">Joined: {new Date(activeClientStat.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 print:hidden items-start">
                 {isEditingClient ? (
                   <button 
                     onClick={saveEditClient}
                     className="px-3 py-2 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl hover:bg-indigo-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                   >
                     <Save className="w-4 h-4" /> Save Details
                   </button>
                 ) : (
                   <button 
                     onClick={startEditClient}
                     className="px-3 py-2 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl hover:bg-indigo-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                   >
                     <Edit2 className="w-4 h-4" /> Edit Profile
                   </button>
                 )}
                 <button 
                   onClick={triggerPrint}
                   className="px-3 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                 >
                   <Printer className="w-4 h-4" /> Print Record
                 </button>
                 <button 
                   onClick={(e) => toggleArchiveStatus(e, activeClientStat.id)}
                   className="px-3 py-2 bg-amber-50 text-amber-700 font-bold text-xs rounded-xl hover:bg-amber-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                 >
                   <Archive className="w-4 h-4" /> {isClientArchived(activeClientStat.status) ? 'Restore to Active' : 'Send to Archive'}
                 </button>
                 <button 
                   onClick={(e) => deleteClient(e, activeClientStat.id)}
                   className="px-3 py-2 bg-rose-50 text-rose-600 font-bold text-xs rounded-xl hover:bg-rose-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                 >
                   <Trash2 className="w-4 h-4" /> Remove
                 </button>
              </div>
            </div>

            {/* Profile Info Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 print:grid-cols-2 print:gap-4">
               <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl print:bg-white print:border-gray-300">
                 <div className="text-[9px] font-black text-gray-400 tracking-widest uppercase mb-1 print:text-gray-600">Physical File No</div>
                 {isEditingClient ? (
                   <input type="text" value={clientEditForm.fileNo} onChange={e => setClientEditForm({...clientEditForm, fileNo: e.target.value})} className="font-mono font-bold text-indigo-700 w-full outline-none border-b-2 border-indigo-500 bg-white px-1 py-0.5 rounded-t" />
                 ) : (
                   <div className="font-mono font-bold text-indigo-700 print:text-gray-900">{activeClientStat.fileNo}</div>
                 )}
               </div>
               <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl print:bg-white print:border-gray-300">
                 <div className="text-[9px] font-black text-gray-400 tracking-widest uppercase mb-1 print:text-gray-600">PAN Detail</div>
                 {isEditingClient ? (
                   <input type="text" value={clientEditForm.pan} onChange={e => setClientEditForm({...clientEditForm, pan: e.target.value})} className="font-mono font-bold text-gray-900 w-full outline-none border-b-2 border-indigo-500 bg-white px-1 py-0.5 rounded-t" />
                 ) : (
                   <div className="font-mono font-bold text-gray-900">{activeClientStat.pan}</div>
                 )}
               </div>
               <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl print:bg-white print:border-gray-300">
                 <div className="text-[9px] font-black text-gray-400 tracking-widest uppercase mb-1 print:text-gray-600">GSTIN</div>
                 {isEditingClient ? (
                   <input type="text" value={clientEditForm.gst} onChange={e => setClientEditForm({...clientEditForm, gst: e.target.value})} className="font-mono font-bold text-gray-900 w-full outline-none border-b-2 border-indigo-500 bg-white px-1 py-0.5 rounded-t" />
                 ) : (
                   <div className="font-mono font-bold text-gray-900">{activeClientStat.gst || 'N/A'}</div>
                 )}
               </div>
               <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl col-span-2 md:col-span-1 print:col-span-2 print:bg-white print:border-gray-300">
                 <div className="text-[9px] font-black text-gray-400 tracking-widest uppercase mb-1 print:text-gray-600">Contact Details</div>
                 {isEditingClient ? (
                   <div className="space-y-2">
                     <input type="text" value={clientEditForm.phone} onChange={e => setClientEditForm({...clientEditForm, phone: e.target.value})} className="text-xs font-bold text-gray-800 w-full outline-none border-b-2 border-indigo-500 bg-white px-1 py-0.5 rounded-t" placeholder="Phone" />
                     <input type="email" value={clientEditForm.email} onChange={e => setClientEditForm({...clientEditForm, email: e.target.value})} className="text-xs font-bold text-gray-600 w-full outline-none border-b-2 border-indigo-500 bg-white px-1 py-0.5 rounded-t" placeholder="Email" />
                   </div>
                 ) : (
                   <>
                     <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 opacity-50 print:hidden" /> {activeClientStat.phone}</div>
                     <div className="text-xs font-bold text-gray-600 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 opacity-50 print:hidden" /> {activeClientStat.email}</div>
                   </>
                 )}
               </div>
               <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl col-span-2 md:col-span-4 print:col-span-2 print:bg-white print:border-gray-300">
                 <div className="text-[9px] font-black text-gray-400 tracking-widest uppercase mb-1 print:text-gray-600">Registered Office Address</div>
                 {isEditingClient ? (
                   <input type="text" value={clientEditForm.address} onChange={e => setClientEditForm({...clientEditForm, address: e.target.value})} className="text-xs font-bold text-gray-600 w-full outline-none border-b-2 border-indigo-500 bg-white px-1 py-0.5 rounded-t" placeholder="Client Address" />
                 ) : (
                   <div className="text-xs font-semibold text-gray-700 flex items-start gap-1.5 mt-0.5 leading-snug">
                     <MapPin className="w-3.5 h-3.5 shrink-0 opacity-50 print:hidden mt-0.5" /> 
                     <span>{activeClientStat.address || 'Address not registered'}</span>
                   </div>
                 )}
               </div>
            </div>

            {/* Attached Record Segment (Hidden in Print) */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 mb-8 print:hidden print-hidden flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black text-indigo-400 tracking-widest uppercase mb-1">Client Related File</div>
                <div className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" /> 
                  {activeClientStat.attachedDoc ? (
                    <button 
                      onClick={() => onShowToast && onShowToast(`Initializing secure download tunnel for ${activeClientStat.attachedDoc}...`, 'info')}
                      className="text-indigo-600 hover:text-indigo-800 hover:underline text-left underline-offset-2 transition-colors cursor-pointer"
                    >
                      {activeClientStat.attachedDoc}
                    </button>
                  ) : "No secure files appended yet."}
                </div>
              </div>
              <div>
                <label className="cursor-pointer px-4 py-2 bg-white border border-gray-200 text-xs font-bold text-gray-700 rounded-xl shadow-sm hover:bg-gray-50 flex items-center gap-2 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> {activeClientStat.attachedDoc ? "Replace File" : "Upload File"}
                  <input type="file" className="hidden" onChange={e => {
                     const file = e.target.files[0];
                     if (file) updateClientDoc(activeClientStat.id, file.name);
                  }} />
                </label>
              </div>
            </div>

            {/* Historical Records (Hidden in Print) */}
            <div className="print:hidden print-hidden">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4">
                <History className="w-4 h-4 text-gray-400" /> Historical Payment & Record Log
              </div>
              
              <div className="space-y-3">
                {activeClientStat.paymentHistory && activeClientStat.paymentHistory.length > 0 ? (
                  activeClientStat.paymentHistory.map((hist, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white border border-gray-100 p-4 rounded-xl shadow-xs">
                      <div>
                        <div className="text-xs font-bold text-gray-900">{hist.desc}</div>
                        <div className="text-[10px] text-gray-500 font-medium">{hist.date}</div>
                      </div>
                      <div className="font-mono font-black text-sm text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                        {hist.amount}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-gray-400 font-bold bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    No historical payment vectors or records found.
                  </div>
                )}
              </div>
            </div>

            {/* Single Client Signatory (Visible in Print) */}
            <div className="hidden print:flex mt-12 pt-6 border-t border-gray-300 justify-between items-end text-[10px] text-gray-500">
              <div>
                <span>TaxPro Practice Management System • Official Record Verification</span>
              </div>
              <div className="text-right">
                <div className="h-10 border-b border-gray-400 w-48 mb-1"></div>
                <span>Authorized Signatory</span>
              </div>
            </div>
            
          </div>
        </div>
      )}

    {/* Undo Toast Action Timer */}
    {undoInfo && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 border border-gray-700 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-fade-in shadow-indigo-900/20">
         <div className="relative w-4 h-4 mr-1">
            <svg className="w-4 h-4 transform -rotate-90 animate-[spin_5s_linear_1]" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#4f46e5" strokeWidth="4" fill="none" strokeDasharray="63" strokeDashoffset="0"></circle></svg>
         </div>
         <span className="text-sm font-semibold tracking-wide flex items-center gap-2">Added <span className="text-indigo-400 font-black">{undoInfo.name}</span></span>
         <div className="w-px h-4 bg-gray-700"></div>
         <button onClick={handleUndoAdd} className="text-white hover:bg-gray-800 bg-gray-700/50 px-3 py-1.5 rounded-lg font-extrabold text-xs transition-colors flex items-center gap-1.5">
           <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
           UNDO
         </button>
      </div>
    )}

    </div>
  );
}
