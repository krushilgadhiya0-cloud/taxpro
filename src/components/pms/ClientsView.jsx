import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Users, Mail, Phone, FileText, CheckCircle, X, Download, 
  Trash2, Printer, History, Archive, MapPin, Edit2, Save, ArrowLeft,
  DollarSign, CreditCard, Calendar, Receipt, TrendingUp, AlertCircle,
  Building2, CheckCheck, ShieldCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { logAuditActivity } from '../../lib/auditLogger';
import { requireFirmSetup } from '../../lib/firmGatekeeper';

export default function ClientsView({ onShowToast }) {
  const [activeTab, setActiveTab] = useState('Active');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeClientStat, setActiveClientStat] = useState(null);
  const [undoInfo, setUndoInfo] = useState(null);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [clientEditForm, setClientEditForm] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [clients, setClients] = useState([]);
  const [allFees, setAllFees] = useState([]);
  const [allReceipts, setAllReceipts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const formatINR = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

  const fetchClientsAndFinancials = async () => {
    setIsLoading(true);
    try {
      const [clientRes, feeRes, recRes] = await Promise.all([
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('fees').select('*').order('created_at', { ascending: false }),
        supabase.from('receipts_payments').select('*').order('created_at', { ascending: false })
      ]);

      const feesData = feeRes.data || [];
      const receiptsData = recRes.data || [];
      setAllFees(feesData);
      setAllReceipts(receiptsData);

      if (!clientRes.error && Array.isArray(clientRes.data) && clientRes.data.length > 0) {
        const mapped = clientRes.data.map(c => {
          // Calculate client-specific lifetime financial totals
          const clientFeeItems = feesData.filter(f => (f.client_name === c.name || f.client_id === c.id));
          const clientReceiptItems = receiptsData.filter(r => (r.party === c.name || (r.title && r.title.includes(c.name))));

          const totalBilled = clientFeeItems.reduce((acc, f) => acc + Number(f.amount || 0), 0) || Number(c.fee_amount || 0);
          const totalPaid = clientFeeItems.reduce((acc, f) => acc + Number(f.paid || 0), 0) + 
                            clientReceiptItems.reduce((acc, r) => acc + (r.type === 'income' ? Number(r.amount || 0) : 0), 0);
          const pendingBalance = Math.max(0, totalBilled - totalPaid);

          let docsArray = [];
          if (Array.isArray(c.attached_docs)) {
            docsArray = c.attached_docs;
          } else if (c.attached_doc) {
            docsArray = String(c.attached_doc).split(',').map(s => s.trim()).filter(Boolean);
          }

          return {
            ...c,
            tradeName: c.trade_name || c.tradeName || c.name,
            fileNo: c.file_no || c.fileNo || '',
            attachedDoc: c.attached_doc,
            attachedDocs: docsArray,
            paymentHistory: c.payment_history || [],
            address: c.client_address || c.address || '',
            feeAmount: Number(c.fee_amount || c.feeAmount || 0),
            billingCycle: c.billing_cycle || c.billingCycle || 'Monthly',
            feeType: c.fee_type || c.feeType || 'Retainer Fee',
            billingStartDate: c.billing_start_date || c.billingStartDate || '',
            serviceScope: c.service_scope || c.serviceScope || '',
            totalBilled,
            totalPaid,
            pendingBalance,
            clientFeeItems,
            clientReceiptItems,
            createdAt: c.created_at
          };
        });

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
    fetchClientsAndFinancials();

    const handleOpenAdd = () => setIsAddModalOpen(true);
    const handleDbUpdate = () => fetchClientsAndFinancials();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setActiveClientStat(null);
        setIsEditingClient(false);
      }
    };

    window.addEventListener('ai_open_add_client', handleOpenAdd);
    window.addEventListener('ai_client_added', handleDbUpdate);
    window.addEventListener('taxpro_db_updated', handleDbUpdate);
    window.addEventListener('taxpro_financial_updated', handleDbUpdate);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('ai_open_add_client', handleOpenAdd);
      window.removeEventListener('ai_client_added', handleDbUpdate);
      window.removeEventListener('taxpro_db_updated', handleDbUpdate);
      window.removeEventListener('taxpro_financial_updated', handleDbUpdate);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const [newClient, setNewClient] = useState({
    name: '', 
    tradeName: '', 
    pan: '', 
    gst: '', 
    fileNo: '', 
    email: '', 
    phone: '', 
    attachedDocName: '', 
    address: '', 
    attachedDocs: [],
    feeAmount: '',
    billingCycle: 'Monthly',
    feeType: 'Retainer Fee',
    billingStartDate: new Date().toISOString().slice(0, 10),
    serviceScope: 'Monthly GST, TDS & Financial Compliance'
  });

  const handleAddClient = async (e) => {
    e.preventDefault();
    if (!newClient.name.trim()) return;

    const clientId = `CL-${Math.floor(500 + Math.random() * 500)}`;
    const finalTradeName = newClient.tradeName.trim() || newClient.name.trim();
    const finalPan = newClient.pan.trim() || 'ABCDE1234F';
    const finalGst = newClient.gst.trim() || '27ABCDE1234F1Z5';
    const finalFileNo = newClient.fileNo.trim() || `FN-${Math.floor(900 + Math.random() * 100)}`;
    const finalEmail = newClient.email.trim() || 'client@taxpro.in';
    const finalPhone = newClient.phone.trim() || '+91 98000 00000';
    const finalDocsList = (newClient.attachedDocs && newClient.attachedDocs.length > 0) 
      ? newClient.attachedDocs 
      : (newClient.attachedDocName ? [newClient.attachedDocName] : []);
    const finalDoc = finalDocsList.join(', ');
    const recurringFee = Number(newClient.feeAmount) || 0;

    const clientPayload = {
      name: newClient.name.trim(),
      trade_name: finalTradeName,
      pan: finalPan,
      gst: finalGst,
      file_no: finalFileNo,
      email: finalEmail,
      phone: finalPhone,
      address: newClient.address || '',
      client_address: newClient.address || '',
      attached_doc: finalDoc,
      attached_docs: finalDocsList,
      fee_amount: recurringFee,
      billing_cycle: newClient.billingCycle || 'Monthly',
      fee_type: newClient.feeType || 'Retainer Fee',
      billing_start_date: newClient.billingStartDate || new Date().toISOString().slice(0, 10),
      service_scope: newClient.serviceScope || '',
      status: 'Active',
      payment_history: []
    };

    const { data: dbData, error: dbError } = await supabase.from('clients').insert([clientPayload]).select();

    if (dbError) {
      if (onShowToast) onShowToast(`Failed to add client: ${dbError.message}`, 'error');
      return;
    }

    const insertedClient = dbData[0];

    // AUTOMATICALLY CREATE ENTRY IN FEES TRACKING IF RECURRING FEE IS ENTERED!
    if (recurringFee > 0) {
      try {
        const nextFeeId = `FT-${Date.now()}`;
        await supabase.from('fees').insert([{
          id: nextFeeId,
          client_name: insertedClient.name,
          client_id: insertedClient.id,
          invoice_no: `INV-${Date.now().toString().slice(-4)}`,
          amount: recurringFee,
          paid: 0,
          pending: recurringFee,
          service: `${newClient.billingCycle} ${newClient.feeType} (${newClient.serviceScope || 'Tax Compliance'})`,
          status: 'Pending',
          due_date: newClient.billingStartDate || new Date().toISOString().slice(0, 10),
          date: new Date().toISOString().slice(0, 10)
        }]);
      } catch (fErr) {
        console.warn('[Auto Fee Generation Note]:', fErr.message);
      }
    }

    const newClientObj = {
      ...insertedClient,
      tradeName: insertedClient.trade_name,
      fileNo: insertedClient.file_no,
      attachedDoc: insertedClient.attached_doc,
      attachedDocs: finalDocsList,
      paymentHistory: insertedClient.payment_history,
      address: insertedClient.client_address || insertedClient.address || '',
      feeAmount: recurringFee,
      billingCycle: newClient.billingCycle,
      feeType: newClient.feeType,
      billingStartDate: newClient.billingStartDate,
      serviceScope: newClient.serviceScope,
      totalBilled: recurringFee,
      totalPaid: 0,
      pendingBalance: recurringFee,
      clientFeeItems: [],
      clientReceiptItems: [],
      createdAt: insertedClient.created_at
    };

    setClients(prev => [newClientObj, ...prev]);
    setIsAddModalOpen(false);
    setNewClient({ 
      name: '', tradeName: '', pan: '', gst: '', fileNo: '', email: '', phone: '', attachedDocName: '', address: '', attachedDocs: [],
      feeAmount: '', billingCycle: 'Monthly', feeType: 'Retainer Fee', billingStartDate: new Date().toISOString().slice(0, 10), serviceScope: 'Monthly GST, TDS & Financial Compliance'
    });

    logAuditActivity({
      action: 'ADD_CLIENT',
      module: 'Clients',
      details: `Registered new client "${newClientObj.name}" (PAN: ${newClientObj.pan}${recurringFee > 0 ? `, Retainer: ${formatINR(recurringFee)} / ${newClient.billingCycle}` : ''})`,
      metadata: { clientId: newClientObj.id, name: newClientObj.name, feeAmount: recurringFee }
    });

    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
    window.dispatchEvent(new CustomEvent('taxpro_financial_updated'));

    if (undoInfo) clearTimeout(undoInfo.timer);

    const timerId = setTimeout(() => {
       setUndoInfo(null);
    }, 5000);

    setUndoInfo({ id: newClientObj.id, name: newClientObj.name, timer: timerId });
    if (onShowToast) {
      if (recurringFee > 0) {
        onShowToast(`✓ Client "${newClientObj.name}" saved & ${formatINR(recurringFee)} (${newClient.billingCycle}) added to Fees Tracking!`, 'success');
      } else {
        onShowToast(`✓ Client "${newClientObj.name}" saved safely!`, 'success');
      }
    }
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
    const c = clients.find(item => item.id === id);
    const clientName = c ? c.name : 'Client';
    
    if (window.confirm(`Are you sure you want to permanently remove "${clientName}"?`)) {
      await supabase.from('clients').delete().eq('id', id);
      setClients(prev => prev.filter(item => item.id !== id));
      if (activeClientStat && activeClientStat.id === id) setActiveClientStat(null);
      if (onShowToast) onShowToast(`Client "${clientName}" removed from directory.`, 'info');
      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
    }
  };

  const toggleArchiveStatus = async (e, id) => {
    e.stopPropagation();
    const c = clients.find(item => item.id === id);
    if (!c) return;

    const newStatus = isClientArchived(c.status) ? 'Active' : 'Archived';
    
    setClients(prev => prev.map(item => {
      if (item.id === id) return { ...item, status: newStatus };
      return item;
    }));

    if (activeClientStat && activeClientStat.id === id) {
       setActiveClientStat(prev => ({ ...prev, status: newStatus }));
    }

    await supabase.from('clients').update({ status: newStatus }).eq('id', id);
    window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
    if (onShowToast) onShowToast(`Client "${c.name}" marked as ${newStatus}.`, 'success');
  };

  const isClientArchived = (status) => status === 'Archived' || status === 'Inactive';

  // OPEN EDIT CLIENT FORM
  const startEditClientCard = (c) => {
    if (!c) return;
    setActiveClientStat(null); // Close dossier view so Edit Modal opens cleanly
    
    let docs = [];
    if (Array.isArray(c.attachedDocs)) docs = c.attachedDocs;
    else if (Array.isArray(c.attached_docs)) docs = c.attached_docs;
    else if (c.attachedDoc) docs = String(c.attachedDoc).split(',').map(s => s.trim()).filter(Boolean);
    else if (c.attached_doc) docs = String(c.attached_doc).split(',').map(s => s.trim()).filter(Boolean);

    setClientEditForm({
      id: c.id,
      name: c.name || '',
      tradeName: c.tradeName || c.trade_name || c.name || '',
      pan: c.pan || '',
      gst: c.gst || '',
      fileNo: c.fileNo || c.file_no || '',
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || c.client_address || '',
      attachedDocs: docs,
      feeAmount: c.feeAmount !== undefined ? String(c.feeAmount) : (c.fee_amount !== undefined ? String(c.fee_amount) : ''),
      billingCycle: c.billingCycle || c.billing_cycle || 'Monthly',
      feeType: c.feeType || c.fee_type || 'Retainer Fee',
      billingStartDate: c.billingStartDate || c.billing_start_date || new Date().toISOString().slice(0, 10),
      serviceScope: c.serviceScope || c.service_scope || ''
    });
    setIsEditingClient(true);
  };

  // SAVE EDIT CLIENT
  const saveEditClient = async () => {
    if (!clientEditForm || !clientEditForm.name.trim()) {
      if (onShowToast) onShowToast('Legal Client Name is required', 'warning');
      return;
    }

    setIsSavingEdit(true);
    const recurringFee = Number(clientEditForm.feeAmount) || 0;
    const finalDocs = Array.isArray(clientEditForm.attachedDocs) ? clientEditForm.attachedDocs : [];
    const finalDoc = finalDocs.join(', ');

    const updatedPayload = {
      name: clientEditForm.name.trim(),
      trade_name: clientEditForm.tradeName.trim() || clientEditForm.name.trim(),
      pan: clientEditForm.pan.trim().toUpperCase(),
      gst: clientEditForm.gst.trim().toUpperCase(),
      file_no: clientEditForm.fileNo.trim(),
      email: clientEditForm.email.trim(),
      phone: clientEditForm.phone.trim(),
      address: clientEditForm.address || '',
      client_address: clientEditForm.address || '',
      attached_doc: finalDoc,
      attached_docs: finalDocs,
      fee_amount: recurringFee,
      billing_cycle: clientEditForm.billingCycle || 'Monthly',
      fee_type: clientEditForm.feeType || 'Retainer Fee',
      billing_start_date: clientEditForm.billingStartDate || new Date().toISOString().slice(0, 10),
      service_scope: clientEditForm.serviceScope || ''
    };

    try {
      const { data: updateRes, error: updateErr } = await supabase
        .from('clients')
        .update(updatedPayload)
        .eq('id', clientEditForm.id);

      if (updateErr) {
        console.error('[Update Client Error]:', updateErr);
        if (onShowToast) onShowToast(`Failed to update client: ${updateErr.message}`, 'error');
        setIsSavingEdit(false);
        return;
      }

      // Update local clients state immediately
      setClients(prev => prev.map(c => {
        if (c.id === clientEditForm.id) {
          const totalBilled = recurringFee > 0 ? recurringFee : c.totalBilled;
          const pendingBalance = Math.max(0, totalBilled - (c.totalPaid || 0));
          return {
            ...c,
            ...updatedPayload,
            tradeName: updatedPayload.trade_name,
            fileNo: updatedPayload.file_no,
            attachedDoc: finalDoc,
            attachedDocs: finalDocs,
            address: clientEditForm.address,
            feeAmount: recurringFee,
            billingCycle: clientEditForm.billingCycle,
            feeType: clientEditForm.feeType,
            billingStartDate: clientEditForm.billingStartDate,
            serviceScope: clientEditForm.serviceScope,
            totalBilled,
            pendingBalance
          };
        }
        return c;
      }));

      // If fee was updated, ensure fees table is synchronized
      if (recurringFee > 0) {
        try {
          const { data: existingFees } = await supabase
            .from('fees')
            .select('*')
            .eq('client_name', clientEditForm.name);

          if (existingFees && existingFees.length > 0) {
            await supabase.from('fees').update({
              amount: recurringFee,
              pending: Math.max(0, recurringFee - Number(existingFees[0].paid || 0)),
              service: `${clientEditForm.billingCycle} ${clientEditForm.feeType}`
            }).eq('id', existingFees[0].id);
          } else {
            await supabase.from('fees').insert([{
              id: `FT-${Date.now()}`,
              client_name: clientEditForm.name,
              client_id: clientEditForm.id,
              invoice_no: `INV-${Date.now().toString().slice(-4)}`,
              amount: recurringFee,
              paid: 0,
              pending: recurringFee,
              service: `${clientEditForm.billingCycle} ${clientEditForm.feeType}`,
              status: 'Pending',
              due_date: clientEditForm.billingStartDate || new Date().toISOString().slice(0, 10),
              date: new Date().toISOString().slice(0, 10)
            }]);
          }
        } catch (fErr) {
          console.warn('[Fee Sync Error]:', fErr.message);
        }
      }

      logAuditActivity({
        action: 'UPDATE_CLIENT',
        module: 'Clients',
        details: `Updated client profile for "${clientEditForm.name}" (Trade: ${updatedPayload.trade_name}, PAN: ${updatedPayload.pan})`,
        metadata: { clientId: clientEditForm.id, name: clientEditForm.name }
      });

      setIsEditingClient(false);
      setClientEditForm(null);
      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
      window.dispatchEvent(new CustomEvent('taxpro_financial_updated'));
      
      if (onShowToast) onShowToast(`✓ Client "${clientEditForm.name}" updated successfully!`, 'success');
      
      // Refresh background data
      fetchClientsAndFinancials();
    } catch (e) {
      console.error('[Save Edit Exception]:', e);
      if (onShowToast) onShowToast(`Error saving changes: ${e.message}`, 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // PRINT ALL / DIRECTORY
  const triggerPrintDirectory = () => {
    logAuditActivity({
      action: 'PRINT_DOCUMENT',
      module: 'Clients',
      details: `Printed Practice Client Directory Register (${clients.length} accounts)`,
      metadata: { count: clients.length }
    });

    if (onShowToast) onShowToast('Generating high-density printable directory...', 'info');
    document.body.classList.remove('printing-client-record');
    setTimeout(() => {
      window.print();
    }, 400);
  };

  // DEDICATED PRINT FOR A SPECIFIC CLIENT RECORD
  const handlePrintSpecificClient = (e, client) => {
    if (e) e.stopPropagation();
    setActiveClientStat(client);

    logAuditActivity({
      action: 'PRINT_DOCUMENT',
      module: 'Clients',
      details: `Printed Official Client Master Record & Financial Dossier for "${client.name}" (File No: ${client.fileNo || 'N/A'})`,
      metadata: { clientId: client.id, name: client.name, fileNo: client.fileNo }
    });

    document.body.classList.add('printing-client-record');
    if (onShowToast) onShowToast(`Preparing official printable record for ${client.name}...`, 'info');
    
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-client-record');
      }, 1200);
    }, 350);
  };

  const filteredClients = clients.filter(c => {
    const isArchived = isClientArchived(c.status);
    let matchesTab = false;
    if (activeTab === 'Active') matchesTab = !isArchived;
    else if (activeTab === 'Archived') matchesTab = isArchived;
    else matchesTab = true;

    const matchesSearch = (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (c.tradeName && c.tradeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (c.pan && c.pan.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (c.gst && c.gst.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (c.fileNo && c.fileNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTab && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f3f4f6] min-h-screen text-gray-800 relative printable-area-container">
      
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print-hidden">
        <div>
          <h1 className="text-2xl font-extrabold font-outfit text-[#1e1e2d]">Client Directory & Compliance Master</h1>
          <p className="text-xs text-gray-500 mt-1">Manage verified accounts, recurring retainers, compliance fees & print client dossiers.</p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button 
            onClick={triggerPrintDirectory}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="Print Entire Client Directory Register"
          >
            <Printer className="w-4 h-4 text-gray-500" />
            <span>Print All Directory</span>
          </button>

          <button 
            onClick={() => {
              if (!requireFirmSetup(onShowToast)) return;
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5b52e0] hover:bg-[#4c44cf] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Client</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 print-hidden">
        
        {/* Status Tabs */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {['Active', 'Archived', 'All'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab 
                  ? 'bg-[#5b52e0] text-white shadow-xs' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab} Clients ({clients.filter(c => tab === 'All' ? true : (tab === 'Archived' ? isClientArchived(c.status) : !isClientArchived(c.status))).length})
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search name, PAN, GSTIN, file no..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:bg-white focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Clients Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 print-hidden">
        {filteredClients.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-400 italic bg-white rounded-2xl border border-gray-200">
            No clients match the current criteria.
          </div>
        ) : (
          filteredClients.map((c) => (
            <div 
              key={c.id}
              onClick={() => setActiveClientStat(c)}
              className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer relative group flex flex-col justify-between hover:border-indigo-300"
            >
              <div>
                {/* Header with Name & Status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {c.name}
                    </h3>
                    <p className="text-[11px] text-gray-500 font-medium">T/A: {c.tradeName || c.name}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    !isClientArchived(c.status) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {c.status || 'Active'}
                  </span>
                </div>

                {/* Recurring Plan & Retainer Badge */}
                {c.feeAmount > 0 && (
                  <div className="mb-3 flex items-center justify-between bg-teal-50/70 border border-teal-200 rounded-xl px-3 py-1.5 text-xs font-bold text-teal-900">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-teal-600" />
                      <span>{c.billingCycle} Plan:</span>
                    </span>
                    <span className="font-mono text-teal-800">{formatINR(c.feeAmount)}</span>
                  </div>
                )}

                {/* Tax Credentials Grid */}
                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100 mb-3 font-mono text-[11px]">
                  <div>
                    <span className="text-[9px] text-gray-400 block uppercase font-bold">PAN</span>
                    <span className="text-gray-800 font-bold">{c.pan || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block uppercase font-bold">GSTIN</span>
                    <span className="text-gray-800 font-bold truncate block">{c.gst || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block uppercase font-bold">File No</span>
                    <span className="text-indigo-600 font-bold">{c.fileNo || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block uppercase font-bold">Phone</span>
                    <span className="text-gray-700 font-bold truncate block">{c.phone || 'N/A'}</span>
                  </div>
                </div>

                {/* Lifetime Financial Summary Pill */}
                <div className="grid grid-cols-3 gap-1 bg-indigo-50/40 border border-indigo-100/60 p-2 rounded-xl text-center text-[10px] font-bold mb-3">
                  <div>
                    <span className="text-gray-400 text-[9px] block">Billed</span>
                    <span className="text-gray-800 font-mono">{formatINR(c.totalBilled)}</span>
                  </div>
                  <div className="border-x border-indigo-100">
                    <span className="text-gray-400 text-[9px] block">Paid</span>
                    <span className="text-emerald-700 font-mono">{formatINR(c.totalPaid)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[9px] block">Due</span>
                    <span className={`font-mono ${c.pendingBalance > 0 ? 'text-rose-600 font-black' : 'text-gray-500'}`}>
                      {formatINR(c.pendingBalance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Card Actions with Direct Edit & Print */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-[11px] text-indigo-600 font-bold hover:underline">
                  View Dossier →
                </span>
                <div className="flex items-center gap-1.5">
                  {/* DIRECT EDIT BUTTON */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); startEditClientCard(c); }}
                    className="p-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200 rounded-lg transition-all cursor-pointer"
                    title={`Edit Client ${c.name}`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* DIRECT PRINT SPECIFIC CLIENT RECORD BUTTON */}
                  <button 
                    onClick={(e) => handlePrintSpecificClient(e, c)}
                    className="p-1.5 bg-gray-50 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-lg transition-all cursor-pointer"
                    title={`Print Official Record for ${c.name}`}
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>

                  <button 
                    onClick={(e) => toggleArchiveStatus(e, c.id)}
                    className="p-1.5 hover:bg-amber-50 text-gray-400 hover:text-amber-600 rounded-lg transition-colors cursor-pointer"
                    title={isClientArchived(c.status) ? 'Restore Client' : 'Archive Client'}
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => deleteClient(e, c.id)}
                    className="p-1.5 hover:bg-rose-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                    title="Delete Client"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {/* ADD CLIENT MODAL */}
      {isAddModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddModalOpen(false); }}
          className="modal-overlay-backdrop print-hidden"
        >
          <div className="modal-content-box max-w-3xl">
            
            {/* Header */}
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
                    Add corporate profile, set automated retainer/fees, and upload KYC files
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer shadow-xs"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Form Body */}
            <form onSubmit={handleAddClient} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold scrollbar-thin">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Column 1: Identity & Retainer Fee Setup */}
                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className="text-gray-700 block mb-1">Legal Client Name <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      placeholder="e.g. Reliance Retail Ventures" 
                      autoFocus 
                      value={newClient.name} 
                      onChange={e => setNewClient({...newClient, name: e.target.value})} 
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 text-xs font-semibold text-gray-900" 
                      required 
                    />
                  </div>

                  <div>
                    <label className="text-gray-700 block mb-1">Trade Name (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Reliance Smart" 
                      value={newClient.tradeName} 
                      onChange={e => setNewClient({...newClient, tradeName: e.target.value})} 
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 text-xs" 
                    />
                  </div>

                  {/* AUTOMATED RETAINER / RECURRING FEE SECTION */}
                  <div className="bg-teal-50/60 border border-teal-200 rounded-xl p-3.5 flex flex-col gap-2.5">
                    <h4 className="text-xs font-extrabold text-teal-900 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-teal-700" />
                      Recurring Payment / Retainer Fee Setup
                    </h4>
                    <p className="text-[10px] text-teal-700 font-medium">
                      Automatically generates active billing invoices in Fees Tracking module.
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-gray-700 block mb-1">Billing Cycle</label>
                        <select
                          value={newClient.billingCycle}
                          onChange={e => setNewClient({...newClient, billingCycle: e.target.value})}
                          className="w-full px-2.5 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:border-teal-600 text-xs cursor-pointer"
                        >
                          <option value="Monthly">Monthly Retainer</option>
                          <option value="Yearly">Yearly Contract</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="One-Time">One-Time Fee</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-gray-700 block mb-1">Amount (₹)</label>
                        <input 
                          type="number" 
                          placeholder="e.g. 15000"
                          value={newClient.feeAmount}
                          onChange={e => setNewClient({...newClient, feeAmount: e.target.value})}
                          className="w-full px-2.5 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:border-teal-600 text-xs font-bold text-gray-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-gray-700 block mb-1">Billing Start / Due Date</label>
                      <input 
                        type="date"
                        value={newClient.billingStartDate}
                        onChange={e => setNewClient({...newClient, billingStartDate: e.target.value})}
                        className="w-full px-2.5 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:border-teal-600 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-700 block mb-1">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="client@acme.com" 
                      value={newClient.email} 
                      onChange={e => setNewClient({...newClient, email: e.target.value})} 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 text-xs" 
                    />
                  </div>
                </div>

                {/* Column 2: Tax Credentials, IDs & KYC Documents */}
                <div className="flex flex-col gap-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-700 block mb-1">PAN Number</label>
                      <input 
                        type="text" 
                        placeholder="ABCDE1234F" 
                        value={newClient.pan} 
                        onChange={e => setNewClient({...newClient, pan: e.target.value.toUpperCase()})} 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-mono text-xs" 
                      />
                    </div>
                    <div>
                      <label className="text-gray-700 block mb-1">GSTIN</label>
                      <input 
                        type="text" 
                        placeholder="27ABCDE1234F1Z5" 
                        value={newClient.gst} 
                        onChange={e => setNewClient({...newClient, gst: e.target.value.toUpperCase()})} 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-mono text-xs" 
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
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-mono text-xs" 
                      />
                    </div>
                    <div>
                      <label className="text-gray-700 block mb-1">File No / Cust ID</label>
                      <input 
                        type="text" 
                        placeholder="FN-100" 
                        value={newClient.fileNo} 
                        onChange={e => setNewClient({...newClient, fileNo: e.target.value})} 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-mono text-xs" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-700 block mb-1">Client Business Address</label>
                    <textarea 
                      rows="2" 
                      placeholder="e.g. 123 Business Suite, Commerce City, Gujarat - 380001" 
                      value={newClient.address} 
                      onChange={e => setNewClient({...newClient, address: e.target.value})} 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 min-h-[60px] text-xs resize-none" 
                    />
                  </div>

                  <div>
                    <label className="text-gray-700 block mb-1">KYC & Related Documents (PAN, GST, Deeds)</label>
                    <div className="border border-dashed border-gray-300 rounded-xl p-3 bg-gray-50 hover:bg-gray-100/80 transition-colors">
                      <input 
                        type="file" 
                        multiple
                        onChange={e => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            const names = files.map(f => f.name);
                            setNewClient(prev => ({
                              ...prev,
                              attachedDocs: Array.from(new Set([...(prev.attachedDocs || []), ...names])),
                              attachedDocName: names[0] || prev.attachedDocName
                            }));
                          }
                        }}
                        className="block w-full text-xs text-gray-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" 
                      />
                      
                      {newClient.attachedDocs && newClient.attachedDocs.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {newClient.attachedDocs.map((doc, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-bold">
                              <FileText className="w-3 h-3 text-indigo-500" />
                              <span className="truncate max-w-[120px]">{doc}</span>
                            </span>
                          ))}
                        </div>
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
                  Save Client & Generate Billing
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* DEDICATED EDIT CLIENT MODAL */}
      {isEditingClient && clientEditForm && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) { setIsEditingClient(false); setClientEditForm(null); } }}
          className="modal-overlay-backdrop print-hidden"
          style={{ zIndex: 999 }}
        >
          <div className="modal-content-box max-w-3xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-xs">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-white tracking-tight">
                    Edit Client: {clientEditForm.name}
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Update profile, recurring retainers, compliance fees & KYC files
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => { setIsEditingClient(false); setClientEditForm(null); }} 
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer shadow-xs"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); saveEditClient(); }} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold scrollbar-thin">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Column 1 */}
                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className="text-gray-700 block mb-1">Legal Client Name <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required 
                      value={clientEditForm.name || ''} 
                      onChange={e => setClientEditForm({...clientEditForm, name: e.target.value})} 
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 text-xs font-semibold text-gray-900" 
                    />
                  </div>

                  <div>
                    <label className="text-gray-700 block mb-1">Trade Name (Optional)</label>
                    <input 
                      type="text" 
                      value={clientEditForm.tradeName || ''} 
                      onChange={e => setClientEditForm({...clientEditForm, tradeName: e.target.value})} 
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 text-xs" 
                    />
                  </div>

                  {/* RECURRING PLAN EDIT */}
                  <div className="bg-teal-50/60 border border-teal-200 rounded-xl p-3 flex flex-col gap-2">
                    <h4 className="text-xs font-extrabold text-teal-900 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-teal-700" />
                      Recurring Payment / Retainer Fee Plan
                    </h4>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-gray-700 block mb-1">Billing Cycle</label>
                        <select
                          value={clientEditForm.billingCycle || 'Monthly'}
                          onChange={e => setClientEditForm({...clientEditForm, billingCycle: e.target.value})}
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl outline-none focus:border-teal-600 text-xs cursor-pointer"
                        >
                          <option value="Monthly">Monthly Retainer</option>
                          <option value="Yearly">Yearly Contract</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="One-Time">One-Time Fee</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-gray-700 block mb-1">Amount (₹)</label>
                        <input 
                          type="number" 
                          value={clientEditForm.feeAmount || ''}
                          onChange={e => setClientEditForm({...clientEditForm, feeAmount: e.target.value})}
                          placeholder="e.g. 15000"
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl outline-none focus:border-teal-600 text-xs font-bold text-gray-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-gray-700 block mb-1">Billing Start / Due Date</label>
                      <input 
                        type="date"
                        value={clientEditForm.billingStartDate || ''}
                        onChange={e => setClientEditForm({...clientEditForm, billingStartDate: e.target.value})}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl outline-none focus:border-teal-600 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-700 block mb-1">Email Address</label>
                    <input 
                      type="email" 
                      value={clientEditForm.email || ''} 
                      onChange={e => setClientEditForm({...clientEditForm, email: e.target.value})} 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 text-xs" 
                    />
                  </div>
                </div>

                {/* Column 2 */}
                <div className="flex flex-col gap-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-700 block mb-1">PAN Number</label>
                      <input 
                        type="text" 
                        value={clientEditForm.pan || ''} 
                        onChange={e => setClientEditForm({...clientEditForm, pan: e.target.value.toUpperCase()})} 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-mono text-xs" 
                      />
                    </div>
                    <div>
                      <label className="text-gray-700 block mb-1">GSTIN</label>
                      <input 
                        type="text" 
                        value={clientEditForm.gst || ''} 
                        onChange={e => setClientEditForm({...clientEditForm, gst: e.target.value.toUpperCase()})} 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-mono text-xs" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-700 block mb-1">Mobile / Phone</label>
                      <input 
                        type="text" 
                        value={clientEditForm.phone || ''} 
                        onChange={e => setClientEditForm({...clientEditForm, phone: e.target.value})} 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-mono text-xs" 
                      />
                    </div>
                    <div>
                      <label className="text-gray-700 block mb-1">File No / Cust ID</label>
                      <input 
                        type="text" 
                        value={clientEditForm.fileNo || ''} 
                        onChange={e => setClientEditForm({...clientEditForm, fileNo: e.target.value})} 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-mono text-xs" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-700 block mb-1">Business Address</label>
                    <textarea 
                      rows="2" 
                      value={clientEditForm.address || ''} 
                      onChange={e => setClientEditForm({...clientEditForm, address: e.target.value})} 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 min-h-[60px] text-xs resize-none" 
                    />
                  </div>

                  <div>
                    <label className="text-gray-700 block mb-1">KYC & Related Documents</label>
                    <div className="border border-dashed border-gray-300 rounded-xl p-3 bg-gray-50 hover:bg-gray-100/80 transition-colors">
                      <input 
                        type="file" 
                        multiple
                        onChange={e => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            const names = files.map(f => f.name);
                            setClientEditForm(prev => ({
                              ...prev,
                              attachedDocs: Array.from(new Set([...(prev.attachedDocs || []), ...names]))
                            }));
                          }
                        }}
                        className="block w-full text-xs text-gray-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" 
                      />

                      {clientEditForm.attachedDocs && clientEditForm.attachedDocs.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {clientEditForm.attachedDocs.map((doc, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-bold">
                              <FileText className="w-3 h-3 text-indigo-500" />
                              <span className="truncate max-w-[120px]">{doc}</span>
                              <button 
                                type="button" 
                                onClick={() => setClientEditForm(prev => ({ ...prev, attachedDocs: prev.attachedDocs.filter((_, i) => i !== idx) }))}
                                className="text-gray-400 hover:text-red-500 cursor-pointer ml-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </div>

              </div>

              {/* Bottom Sticky Actions */}
              <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 mt-3 -mx-6 -mb-6">
                <button 
                  type="button" 
                  onClick={() => { setIsEditingClient(false); setClientEditForm(null); }} 
                  className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSavingEdit}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* DETAILED STATS, FINANCIAL DOSSIER & SPECIFIC CLIENT PRINT MODAL */}
      {activeClientStat && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) { setActiveClientStat(null); setIsEditingClient(false); } }}
          className="modal-overlay-backdrop print:bg-transparent print:static print:p-0"
        >
          <div className="modal-content-box max-w-3xl p-6 md:p-8 client-print-document print:border-none print:shadow-none print:max-w-full scrollbar-thin print:p-0 print:m-0 max-h-[92vh] overflow-y-auto">
            
            {/* OFFICIAL PRINT LETTERHEAD HEADER */}
            <div className="hidden print:block border-b-2 border-gray-900 pb-4 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 font-outfit uppercase">
                      TAXPRO PRACTICE MANAGEMENT SYSTEM
                    </h1>
                  </div>
                  <p className="text-[11px] text-gray-700 font-bold uppercase tracking-wider mt-0.5">
                    Official Client Master Record & Financial Dossier Statement
                  </p>
                  <p className="text-[9px] text-gray-500 font-medium">
                    Corporate Compliance • Direct & Indirect Tax Practice • Advisory
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-black text-gray-900">
                    File No: <span className="text-indigo-900">{activeClientStat.fileNo || 'FN-N/A'}</span>
                  </div>
                  <div className="text-[10px] font-mono text-gray-600 mt-0.5">
                    Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="text-[10px] font-bold uppercase text-emerald-800 mt-0.5">
                    Account Status: {activeClientStat.status || 'Active'}
                  </div>
                </div>
              </div>
            </div>

            {/* Top Close & Back Controls */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 print:hidden">
              <button 
                type="button" 
                onClick={() => setActiveClientStat(null)}
                className="p-2 rounded-xl bg-gray-50 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-colors flex items-center gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
                title="Go Back"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Directory</span>
              </button>

              <button 
                onClick={() => setActiveClientStat(null)} 
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
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
                <h3 className="text-2xl font-extrabold text-[#1e1e2d] font-outfit leading-tight mb-1 print:text-black">
                  {activeClientStat.name}
                </h3>
                <div className="text-sm font-bold text-gray-500 mb-1">T/A: {activeClientStat.tradeName || activeClientStat.name}</div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                    activeClientStat.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {activeClientStat.status}
                  </span>
                  {activeClientStat.feeAmount > 0 && (
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-teal-600" /> {formatINR(activeClientStat.feeAmount)} / {activeClientStat.billingCycle} Plan
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 print:hidden items-start">
                 <button 
                   onClick={() => startEditClientCard(activeClientStat)}
                   className="px-3 py-2 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl hover:bg-indigo-100 flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-100"
                 >
                   <Edit2 className="w-4 h-4" /> Edit Profile
                 </button>
                 <button 
                   onClick={(e) => handlePrintSpecificClient(e, activeClientStat)}
                   className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                   title="Print this client's official record & ledger"
                 >
                   <Printer className="w-4 h-4" /> Print Client Record
                 </button>
              </div>
            </div>

            {/* Profile Info Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 print:grid-cols-2 print:gap-4">
               <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl print:bg-white print:border-gray-300">
                 <div className="text-[9px] font-black text-gray-400 tracking-widest uppercase mb-1 print:text-gray-600">Physical File No</div>
                 <div className="font-mono font-bold text-indigo-700 print:text-gray-900">{activeClientStat.fileNo || 'N/A'}</div>
               </div>
               <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl print:bg-white print:border-gray-300">
                 <div className="text-[9px] font-black text-gray-400 tracking-widest uppercase mb-1 print:text-gray-600">PAN Detail</div>
                 <div className="font-mono font-bold text-gray-900">{activeClientStat.pan || 'N/A'}</div>
               </div>
               <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl print:bg-white print:border-gray-300">
                 <div className="text-[9px] font-black text-gray-400 tracking-widest uppercase mb-1 print:text-gray-600">GSTIN</div>
                 <div className="font-mono font-bold text-gray-900">{activeClientStat.gst || 'N/A'}</div>
               </div>
               <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl col-span-2 md:col-span-1 print:bg-white print:border-gray-300">
                 <div className="text-[9px] font-black text-gray-400 tracking-widest uppercase mb-1 print:text-gray-600">Contact Details</div>
                 <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 opacity-50 print:hidden" /> {activeClientStat.phone || 'N/A'}</div>
                 <div className="text-xs font-bold text-gray-600 flex items-center gap-1.5 truncate"><Mail className="w-3.5 h-3.5 opacity-50 print:hidden" /> {activeClientStat.email || 'N/A'}</div>
               </div>
               <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl col-span-2 md:col-span-4 print:col-span-2 print:bg-white print:border-gray-300">
                 <div className="text-[9px] font-black text-gray-400 tracking-widest uppercase mb-1 print:text-gray-600">Registered Business Address</div>
                 <div className="text-xs font-semibold text-gray-800">{activeClientStat.address || activeClientStat.client_address || 'Address not registered'}</div>
               </div>
            </div>

            {/* FINANCIAL SUMMARY & LEDGER STATEMENT */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-gray-900 text-white rounded-2xl p-5 mb-6 shadow-md border border-indigo-800 print:bg-white print:text-black print:border-gray-400 print:p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-teal-400 print:hidden" />
                  <h4 className="text-sm font-black uppercase tracking-wider text-white print:text-gray-900">
                    Client Total Financial Dossier & Balance
                  </h4>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-white/10 text-teal-300 border border-white/10 print:bg-gray-100 print:text-gray-900 print:border-gray-300">
                  Live Ledger
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 print:bg-white print:border-gray-300">
                  <span className="text-[10px] text-gray-300 font-bold block uppercase print:text-gray-600">Lifetime Billed</span>
                  <span className="text-base sm:text-lg font-black font-mono text-white mt-1 block print:text-gray-900">
                    {formatINR(activeClientStat.totalBilled)}
                  </span>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-3 print:bg-white print:border-gray-300">
                  <span className="text-[10px] text-emerald-300 font-bold block uppercase print:text-gray-600">Total Paid</span>
                  <span className="text-base sm:text-lg font-black font-mono text-emerald-400 mt-1 block print:text-gray-900">
                    {formatINR(activeClientStat.totalPaid)}
                  </span>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-3 print:bg-white print:border-gray-300">
                  <span className="text-[10px] text-rose-300 font-bold block uppercase print:text-gray-600">Pending Balance</span>
                  <span className="text-base sm:text-lg font-black font-mono text-rose-400 mt-1 block print:text-gray-900">
                    {formatINR(activeClientStat.pendingBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Attached Documents */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 mb-6 print:bg-white print:border-gray-300">
              <div className="text-[10px] font-black text-indigo-400 tracking-widest uppercase mb-1 print:text-gray-600">Attached KYC & Verification Documents</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {activeClientStat.attachedDocs && activeClientStat.attachedDocs.length > 0 ? (
                  activeClientStat.attachedDocs.map((doc, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-indigo-700 shadow-2xs print:border-gray-300 print:text-gray-900">
                      <FileText className="w-3.5 h-3.5 text-indigo-500 print:hidden" />
                      <span>{doc}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic">No attached files uploaded.</span>
                )}
              </div>
            </div>

            {/* Historical Payment Log */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3">
                <Receipt className="w-4 h-4 text-gray-500 print:hidden" /> Recent Receipts & Payment Transactions
              </div>
              
              <div className="space-y-2">
                {activeClientStat.clientReceiptItems && activeClientStat.clientReceiptItems.length > 0 ? (
                  activeClientStat.clientReceiptItems.map((r, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 border border-gray-200 p-3 rounded-xl text-xs print:bg-white print:border-gray-300">
                      <div>
                        <div className="font-bold text-gray-900">{r.title || 'Client Retainer Payment'}</div>
                        <div className="text-[10px] text-gray-500">{r.date} • Mode: {r.method || 'Bank Transfer'}</div>
                      </div>
                      <div className="font-mono font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 print:bg-transparent print:border-none print:text-gray-900">
                        + {formatINR(r.amount)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-xs text-gray-400 italic bg-gray-50 rounded-xl border border-dashed border-gray-200 print:bg-white">
                    No payment receipts logged yet.
                  </div>
                )}
              </div>
            </div>

            {/* Single Client Signatory Block */}
            <div className="hidden print:flex mt-12 pt-6 border-t-2 border-gray-400 justify-between items-end text-[10px] text-gray-600">
              <div>
                <p className="font-bold text-gray-900">TaxPro PMS • Certified Client Master Summary</p>
                <p className="text-[9px] text-gray-500">This is a computer generated document and valid without seal if verified.</p>
              </div>
              <div className="text-right">
                <div className="h-10 border-b border-gray-500 w-52 mb-1"></div>
                <span className="font-bold text-gray-900">Authorized Signatory / Partner Stamp</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Undo Toast Action */}
      {undoInfo && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 border border-gray-700 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-fade-in shadow-indigo-900/20 print-hidden">
           <span className="text-xs font-semibold tracking-wide">Added <span className="text-indigo-400 font-bold">{undoInfo.name}</span></span>
           <button onClick={handleUndoAdd} className="text-white hover:bg-gray-800 bg-gray-700 px-2.5 py-1 rounded-lg font-bold text-xs">
             UNDO
           </button>
        </div>
      )}

    </div>
  );
}
