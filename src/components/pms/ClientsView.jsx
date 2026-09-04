import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Users, Mail, Phone, FileText, CheckCircle, X, Download, 
  Trash2, Printer, History, Archive, MapPin, Edit2, Save, ArrowLeft,
  DollarSign, CreditCard, Calendar, Receipt, TrendingUp, AlertCircle,
  Building2, CheckCheck, ShieldCheck, FileSpreadsheet, Filter, Clock,
  SlidersHorizontal, CheckCircle2, RotateCcw
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { logAuditActivity } from '../../lib/auditLogger';
import { requireFirmSetup } from '../../lib/firmGatekeeper';
import { printHtml } from '../../lib/printHelper';
import { formatDate } from '../../lib/dateUtils';
import BulkClientsModal from './BulkClientsModal';

export default function ClientsView({ onShowToast }) {
  const [activeTab, setActiveTab] = useState('Active');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [activeClientStat, setActiveClientStat] = useState(null);
  const [undoInfo, setUndoInfo] = useState(null);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [clientEditForm, setClientEditForm] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Client Dossier Financial Ledger Filter States
  const [dossierTab, setDossierTab] = useState('ALL'); // 'ALL', 'BILLED', 'PAID', 'PENDING'
  const [dossierMonth, setDossierMonth] = useState('ALL'); // 'ALL', '01'..'12'
  const [dossierYear, setDossierYear] = useState('ALL'); // 'ALL', '2026', '2025', '2024'
  const [dossierFromDate, setDossierFromDate] = useState('');
  const [dossierToDate, setDossierToDate] = useState('');
  const [dossierSearch, setDossierSearch] = useState('');

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
            category: c.category || 'Pvt Ltd',
            pan: c.pan || '',
            gst: c.gst || '',
            phone: c.phone || '',
            email: c.email || '',
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

  // -------------------------------------------------------------------------
  // CLIENT FINANCIAL TRANSACTIONS LEDGER (Compiles Fees, Receipts & History)
  // -------------------------------------------------------------------------
  const clientTransactions = useMemo(() => {
    if (!activeClientStat) return [];
    const list = [];
    const clientName = activeClientStat.name;
    const clientId = activeClientStat.id;

    // 1. Invoices & Due Fees from fees table
    (activeClientStat.clientFeeItems || []).forEach(f => {
      const amt = Number(f.amount || 0);
      const paid = Number(f.paid || 0);
      const pending = Number(f.pending !== undefined ? f.pending : Math.max(0, amt - paid));
      list.push({
        id: f.id,
        date: f.date || (f.created_at || '').split('T')[0] || f.due_date || new Date().toISOString().slice(0, 10),
        type: 'INVOICE',
        title: f.service || 'Client Retainer / Tax Compliance Fee',
        invoiceNo: f.invoice_no || `INV-${f.id.slice(-4)}`,
        amount: amt,
        paid: paid,
        pending: pending,
        status: f.status || (pending === 0 && amt > 0 ? 'Paid' : 'Pending'),
        method: f.payment_mode || 'Bank Transfer',
        notes: f.notes || f.service
      });
    });

    // If client has recurring feeAmount configured but no fee row in DB yet, synthesize current cycle invoice
    if (list.filter(i => i.type === 'INVOICE').length === 0 && Number(activeClientStat.feeAmount || 0) > 0) {
      const curMonthKey = new Date().toISOString().slice(0, 7);
      const amt = Number(activeClientStat.feeAmount || 0);
      const paid = Number(activeClientStat.totalPaid || 0);
      const pending = Math.max(0, amt - paid);
      list.push({
        id: `RET-${clientId}`,
        date: activeClientStat.billingStartDate || `${curMonthKey}-01`,
        type: 'INVOICE',
        title: `${activeClientStat.billingCycle || 'Monthly'} Retainer Plan (${activeClientStat.serviceScope || 'Direct & Indirect Tax Compliance'})`,
        invoiceNo: `INV-${curMonthKey.replace('-', '')}-${(clientName || 'CL').slice(0, 3).toUpperCase()}`,
        amount: amt,
        paid: paid,
        pending: pending,
        status: paid >= amt ? 'Paid' : 'Pending',
        method: 'Bank Transfer',
        notes: activeClientStat.serviceScope || 'Tax Compliance Retainer'
      });
    }

    // 2. Receipts & Payments from receipts_payments table
    (activeClientStat.clientReceiptItems || []).forEach(r => {
      const amt = Number(r.amount || 0);
      list.push({
        id: r.id,
        date: r.date || (r.created_at || '').split('T')[0] || new Date().toISOString().slice(0, 10),
        type: 'PAYMENT',
        title: r.title || 'Client Retainer Payment Received',
        invoiceNo: r.reference || `REC-${r.id.slice(-4)}`,
        amount: amt,
        paid: amt,
        pending: 0,
        status: 'Paid',
        method: r.method || 'Bank Transfer',
        notes: r.notes || r.category || 'Direct settlement'
      });
    });

    // 3. Payment history array from client object if any
    (activeClientStat.paymentHistory || []).forEach((p, idx) => {
      if (!list.some(item => item.id === p.id || item.invoiceNo === p.refNo)) {
        const amt = Number(p.amount || 0);
        list.push({
          id: p.id || `HIST-${idx}`,
          date: p.date || new Date().toISOString().slice(0, 10),
          type: 'PAYMENT',
          title: p.title || p.description || 'Payment Received',
          invoiceNo: p.refNo || `RCP-${idx + 101}`,
          amount: amt,
          paid: amt,
          pending: 0,
          status: 'Paid',
          method: p.method || 'Bank Transfer',
          notes: p.notes || ''
        });
      }
    });

    // Sort by date descending
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [activeClientStat]);

  const filteredClientTransactions = useMemo(() => {
    return clientTransactions.filter(item => {
      // 1. Tab filter
      if (dossierTab === 'BILLED' && item.type !== 'INVOICE') return false;
      if (dossierTab === 'PAID' && item.type !== 'PAYMENT' && item.status !== 'Paid') return false;
      if (dossierTab === 'PENDING' && (item.pending <= 0 || item.status === 'Paid')) return false;

      // 2. Month filter
      if (dossierMonth !== 'ALL') {
        const itemMonth = (item.date || '').slice(5, 7);
        if (itemMonth !== dossierMonth) return false;
      }

      // 3. Year filter
      if (dossierYear !== 'ALL') {
        const itemYear = (item.date || '').slice(0, 4);
        if (itemYear !== dossierYear) return false;
      }

      // 4. Custom Date Range
      if (dossierFromDate && item.date < dossierFromDate) return false;
      if (dossierToDate && item.date > dossierToDate) return false;

      // 5. Search query
      if (dossierSearch.trim()) {
        const term = dossierSearch.toLowerCase();
        const match = 
          item.title.toLowerCase().includes(term) ||
          item.invoiceNo.toLowerCase().includes(term) ||
          item.method.toLowerCase().includes(term) ||
          (item.notes && item.notes.toLowerCase().includes(term));
        if (!match) return false;
      }

      return true;
    });
  }, [clientTransactions, dossierTab, dossierMonth, dossierYear, dossierFromDate, dossierToDate, dossierSearch]);

  const dossierFilteredBilled = useMemo(() => {
    return filteredClientTransactions
      .filter(i => i.type === 'INVOICE')
      .reduce((acc, i) => acc + Number(i.amount || 0), 0);
  }, [filteredClientTransactions]);

  const dossierFilteredPaid = useMemo(() => {
    return filteredClientTransactions
      .filter(i => i.type === 'PAYMENT' || i.status === 'Paid')
      .reduce((acc, i) => acc + Number(i.paid || i.amount || 0), 0);
  }, [filteredClientTransactions]);

  const dossierFilteredPending = useMemo(() => {
    return filteredClientTransactions
      .filter(i => i.type === 'INVOICE' && i.status !== 'Paid')
      .reduce((acc, i) => acc + Number(i.pending || 0), 0);
  }, [filteredClientTransactions]);

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
    category: 'Pvt Ltd',
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

    const clientId = `CLI-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const finalTradeName = newClient.tradeName.trim() || newClient.name.trim();
    const finalPan = newClient.pan.trim().toUpperCase();
    const finalGst = newClient.gst.trim().toUpperCase();
    const finalFileNo = newClient.fileNo.trim() || `FN-${Math.floor(100 + Math.random() * 900)}`;
    const finalEmail = newClient.email.trim();
    const finalPhone = newClient.phone.trim();
    const finalDocsList = (newClient.attachedDocs && newClient.attachedDocs.length > 0) 
      ? newClient.attachedDocs 
      : (newClient.attachedDocName ? [newClient.attachedDocName] : []);
    const finalDoc = finalDocsList.join(', ');
    const recurringFee = Number(newClient.feeAmount) || 0;

    const clientPayload = {
      id: clientId,
      name: newClient.name.trim(),
      trade_name: finalTradeName,
      pan: finalPan,
      gst: finalGst,
      file_no: finalFileNo,
      email: finalEmail,
      phone: finalPhone,
      address: newClient.address || '',
      client_address: newClient.address || '',
      category: newClient.category || 'Pvt Ltd',
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

    const insertedClient = (dbData && dbData[0]) ? dbData[0] : clientPayload;

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
      tradeName: insertedClient.trade_name || finalTradeName,
      fileNo: insertedClient.file_no || finalFileNo,
      category: insertedClient.category || newClient.category || 'Pvt Ltd',
      pan: insertedClient.pan || finalPan,
      gst: insertedClient.gst || finalGst,
      phone: insertedClient.phone || finalPhone,
      email: insertedClient.email || finalEmail,
      attachedDoc: insertedClient.attached_doc,
      attachedDocs: finalDocsList,
      paymentHistory: insertedClient.payment_history || [],
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
      createdAt: insertedClient.created_at || new Date().toISOString()
    };

    setClients(prev => [newClientObj, ...prev]);
    setIsAddModalOpen(false);
    setNewClient({ 
      name: '', tradeName: '', pan: '', gst: '', fileNo: '', email: '', phone: '', attachedDocName: '', address: '', category: 'Pvt Ltd', attachedDocs: [],
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

  const [clientToDelete, setClientToDelete] = useState(null);
  const [isDeletingClient, setIsDeletingClient] = useState(false);

  const handleRequestDeleteClient = (e, client) => {
    if (e) e.stopPropagation();
    setClientToDelete(client);
  };

  const handleConfirmDeleteClient = async () => {
    if (!clientToDelete) return;
    setIsDeletingClient(true);

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientToDelete.id);

      if (error) {
        console.error('[Delete Client Error]:', error);
        if (onShowToast) onShowToast(`Failed to delete client: ${error.message}`, 'error');
        setIsDeletingClient(false);
        return;
      }

      setClients(prev => {
        const updated = prev.filter(item => item.id !== clientToDelete.id);
        localStorage.setItem('taxpro_cached_clients', JSON.stringify(updated));
        return updated;
      });

      if (activeClientStat && activeClientStat.id === clientToDelete.id) {
        setActiveClientStat(null);
      }
      if (isEditingClient && clientEditForm && clientEditForm.id === clientToDelete.id) {
        setIsEditingClient(false);
        setClientEditForm(null);
      }

      logAuditActivity({
        action: 'DELETE_CLIENT',
        module: 'Clients',
        details: `Permanently removed client account "${clientToDelete.name}" (${clientToDelete.id}) from workspace.`,
        metadata: { clientId: clientToDelete.id, clientName: clientToDelete.name }
      });

      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
      window.dispatchEvent(new CustomEvent('taxpro_financial_updated'));

      if (onShowToast) onShowToast(`✓ Client "${clientToDelete.name}" has been permanently deleted.`, 'success');
      setClientToDelete(null);
    } catch (err) {
      console.error('[Delete Client Exception]:', err);
      if (onShowToast) onShowToast(`Failed to delete client: ${err.message}`, 'error');
    } finally {
      setIsDeletingClient(false);
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
      category: c.category || 'Pvt Ltd',
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
      category: clientEditForm.category || 'Pvt Ltd',
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
            category: updatedPayload.category,
            pan: updatedPayload.pan,
            gst: updatedPayload.gst,
            email: updatedPayload.email,
            phone: updatedPayload.phone,
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
    const list = filteredClients.length > 0 ? filteredClients : clients;
    if (list.length === 0) {
      if (onShowToast) onShowToast('No clients available to print.', 'warning');
      return;
    }

    logAuditActivity({
      action: 'PRINT_DOCUMENT',
      module: 'Clients',
      details: `Printed Practice Client Directory Register (${list.length} accounts)`,
      metadata: { count: list.length }
    });

    const rows = list.map((c, idx) => `
      <tr style="border-bottom: 1px solid #e5e7eb; background: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
        <td style="font-family: monospace; color: #64748b; text-align: center;">${idx + 1}</td>
        <td>
          <strong style="color: #0f172a; font-size: 11.5px;">${c.name || 'Unnamed Client'}</strong>
          ${c.tradeName ? `<div style="font-size: 9.5px; color: #64748b;">${c.tradeName}</div>` : ''}
        </td>
        <td>${c.fileNo || 'N/A'}</td>
        <td style="font-family: monospace; font-weight: 700; color: #0f766e;">${c.pan || 'N/A'}</td>
        <td style="font-family: monospace;">${c.gstin || c.gst || 'N/A'}</td>
        <td>${c.phone || c.mobile || 'N/A'}</td>
        <td>${c.email || 'N/A'}</td>
        <td><span class="badge-blue">${c.category || 'Individual'}</span></td>
        <td style="text-align: right;">
          <span class="status-pill ${c.status === 'Archived' ? 'status-pending' : 'status-completed'}">
            ${c.status || 'Active'}
          </span>
        </td>
      </tr>
    `).join('');

    const bodyHtml = `
      <div style="margin-bottom: 12px; font-weight: 800; font-size: 13px; color: #1e293b;">
        Client Master Directory & Practice Accounts (${list.length} Records)
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 35px; text-align: center;">#</th>
            <th>Client / Entity Name</th>
            <th>File No</th>
            <th>PAN</th>
            <th>GSTIN</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Category</th>
            <th style="text-align: right;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    printHtml('Client Master Directory', bodyHtml);
    if (onShowToast) onShowToast('🖨️ Generating printable client directory...', 'info');
  };

  // DEDICATED PRINT FOR A SPECIFIC CLIENT RECORD
  const handlePrintSpecificClient = (e, client) => {
    if (e) e.stopPropagation();
    if (!client) return;

    logAuditActivity({
      action: 'PRINT_DOCUMENT',
      module: 'Clients',
      details: `Printed Official Client Master Record & Financial Dossier for "${client.name}" (File No: ${client.fileNo || 'N/A'})`,
      metadata: { clientId: client.id, name: client.name, fileNo: client.fileNo }
    });

    const bodyHtml = `
      <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 18px; font-weight: 900; color: #0f766e;">${client.name}</div>
            ${client.tradeName ? `<div style="font-size: 12px; font-weight: 700; color: #115e59; margin-top: 2px;">Trade Name: ${client.tradeName}</div>` : ''}
            <div style="font-size: 10.5px; color: #64748b; margin-top: 4px;">File No: <strong>${client.fileNo || 'N/A'}</strong> • Client ID: <strong>${client.id || 'N/A'}</strong></div>
          </div>
          <div style="text-align: right;">
            <span class="status-pill status-completed" style="font-size: 11px; padding: 4px 10px;">
              ${client.status || 'Active'}
            </span>
          </div>
        </div>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 14px;">
        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">Tax & Identification Credentials</div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
          <div>
            <div style="font-size: 9px; color: #94a3b8; font-weight: 800; text-transform: uppercase;">PAN Number</div>
            <div style="font-size: 12px; font-weight: 800; font-family: monospace; color: #0f766e; margin-top: 2px;">${client.pan || 'N/A'}</div>
          </div>
          <div>
            <div style="font-size: 9px; color: #94a3b8; font-weight: 800; text-transform: uppercase;">GSTIN</div>
            <div style="font-size: 12px; font-weight: 800; font-family: monospace; color: #1e293b; margin-top: 2px;">${client.gstin || client.gst || 'N/A'}</div>
          </div>
          <div>
            <div style="font-size: 9px; color: #94a3b8; font-weight: 800; text-transform: uppercase;">Aadhaar Number</div>
            <div style="font-size: 12px; font-weight: 800; font-family: monospace; color: #1e293b; margin-top: 2px;">${client.aadhaar || 'N/A'}</div>
          </div>
        </div>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 14px;">
        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">Contact & Address Details</div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
          <div>
            <div style="font-size: 9px; color: #94a3b8; font-weight: 800; text-transform: uppercase;">Mobile Phone</div>
            <div style="font-size: 11.5px; font-weight: 700; color: #1e293b; margin-top: 2px;">${client.phone || client.mobile || 'N/A'}</div>
          </div>
          <div>
            <div style="font-size: 9px; color: #94a3b8; font-weight: 800; text-transform: uppercase;">Email Address</div>
            <div style="font-size: 11.5px; font-weight: 700; color: #1e293b; margin-top: 2px;">${client.email || 'N/A'}</div>
          </div>
          <div>
            <div style="font-size: 9px; color: #94a3b8; font-weight: 800; text-transform: uppercase;">Category / Entity Type</div>
            <div style="font-size: 11.5px; font-weight: 700; color: #1e293b; margin-top: 2px;">${client.category || 'Individual'}</div>
          </div>
        </div>
        ${client.address ? `<div style="margin-top: 8px; font-size: 11px; color: #475569; padding-top: 6px; border-top: 1px solid #e2e8f0;">Address: ${client.address}</div>` : ''}
      </div>
    `;

    printHtml(`Client Dossier - ${client.name}`, bodyHtml);
    if (onShowToast) onShowToast(`🖨️ Generating printable dossier for ${client.name}...`, 'info');
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
              setIsBulkModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="Import multiple clients from Excel or CSV with template format"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            <span>Bulk Import Clients</span>
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
                {/* Header with Name, Category & Status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-extrabold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {c.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-[11px] text-gray-500 font-medium truncate">T/A: {c.tradeName || c.name}</p>
                      {c.category && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100/80">
                          {c.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
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
                    <span className={`font-bold ${c.pan ? 'text-gray-800' : 'text-gray-400 font-normal italic'}`}>
                      {c.pan || 'Not Set'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block uppercase font-bold">GSTIN</span>
                    <span className={`font-bold truncate block ${c.gst ? 'text-gray-800' : 'text-gray-400 font-normal italic'}`}>
                      {c.gst || 'Not Set'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block uppercase font-bold">File No</span>
                    <span className={`font-bold ${c.fileNo ? 'text-indigo-600' : 'text-gray-400 font-normal italic'}`}>
                      {c.fileNo || 'Not Set'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block uppercase font-bold">Phone</span>
                    <span className={`font-bold truncate block ${c.phone ? 'text-gray-700' : 'text-gray-400 font-normal italic'}`}>
                      {c.phone || 'Not Set'}
                    </span>
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
                    onClick={(e) => handleRequestDeleteClient(e, c)}
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
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth">
            
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-slate-900 tracking-tight">
                    Register New Client
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Add corporate profile, set automated retainer/fees, and upload KYC files
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Form Body */}
            <form onSubmit={handleAddClient} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 text-xs font-semibold overscroll-contain chat-custom-scrollbar">
              
              {/* SECTION 1: CORPORATE IDENTITY & TAX CREDENTIALS */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4.5 sm:p-5 flex flex-col gap-4">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Corporate Identity & Tax Credentials</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column */}
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-slate-700 block mb-1">Legal Client Name <span className="text-rose-500">*</span></label>
                      <input 
                        type="text" 
                        placeholder="e.g. Reliance Retail Ventures Ltd" 
                        autoFocus 
                        value={newClient.name} 
                        onChange={e => setNewClient({...newClient, name: e.target.value})} 
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs font-semibold text-slate-900 shadow-2xs" 
                        required 
                      />
                    </div>

                    <div>
                      <label className="text-slate-700 block mb-1">Trade Name (Optional)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Reliance Smart" 
                        value={newClient.tradeName} 
                        onChange={e => setNewClient({...newClient, tradeName: e.target.value})} 
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs shadow-2xs" 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-700 block mb-1">Entity Category</label>
                        <select
                          value={newClient.category || 'Pvt Ltd'}
                          onChange={e => setNewClient({...newClient, category: e.target.value})}
                          className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs cursor-pointer shadow-2xs"
                        >
                          <option value="Pvt Ltd">Pvt Ltd Company</option>
                          <option value="Public Ltd">Public Ltd Company</option>
                          <option value="LLP">Limited Liability (LLP)</option>
                          <option value="Partnership">Partnership Firm</option>
                          <option value="Proprietorship">Proprietorship</option>
                          <option value="Individual">Individual / Salaried</option>
                          <option value="Trust/Society">Trust / Society / NGO</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-700 block mb-1">File No / Cust ID</label>
                        <input 
                          type="text" 
                          placeholder="FN-100" 
                          value={newClient.fileNo} 
                          onChange={e => setNewClient({...newClient, fileNo: e.target.value})} 
                          className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 font-mono text-xs shadow-2xs" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-700 block mb-1">PAN Number</label>
                        <input 
                          type="text" 
                          placeholder="ABCDE1234F" 
                          value={newClient.pan} 
                          onChange={e => setNewClient({...newClient, pan: e.target.value.toUpperCase()})} 
                          className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 font-mono text-xs uppercase shadow-2xs" 
                        />
                      </div>

                      <div>
                        <label className="text-slate-700 block mb-1">GSTIN</label>
                        <input 
                          type="text" 
                          placeholder="27ABCDE1234F1Z5" 
                          value={newClient.gst} 
                          onChange={e => setNewClient({...newClient, gst: e.target.value.toUpperCase()})} 
                          className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 font-mono text-xs uppercase shadow-2xs" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-700 block mb-1">Mobile / Phone</label>
                      <input 
                        type="text" 
                        placeholder="+91 98000 00000" 
                        value={newClient.phone} 
                        onChange={e => setNewClient({...newClient, phone: e.target.value})} 
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs shadow-2xs" 
                      />
                    </div>

                    <div>
                      <label className="text-slate-700 block mb-1">Email Address</label>
                      <input 
                        type="email" 
                        placeholder="compliance@acme.com" 
                        value={newClient.email} 
                        onChange={e => setNewClient({...newClient, email: e.target.value})} 
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs shadow-2xs" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: ADDRESS & KYC DOCUMENTS */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4.5 sm:p-5 flex flex-col gap-4">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <span>Business Address & KYC Documents</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-700 block mb-1">Client Business Address</label>
                    <textarea 
                      rows="3" 
                      placeholder="e.g. 123 Business Suite, Commerce City, Gujarat - 380001" 
                      value={newClient.address} 
                      onChange={e => setNewClient({...newClient, address: e.target.value})} 
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs resize-none shadow-2xs min-h-[75px]" 
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1">KYC & Related Documents (PAN, GST, Deeds)</label>
                    <div className="border border-dashed border-slate-300 rounded-2xl p-3 bg-white hover:bg-slate-50 transition-colors shadow-2xs">
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
                        className="block w-full text-xs text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" 
                      />
                      
                      {newClient.attachedDocs && newClient.attachedDocs.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {newClient.attachedDocs.map((doc, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-bold">
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

              {/* SECTION 3: AUTOMATED RETAINER & RECURRING FEE SETUP (FULL WIDTH) */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4.5 sm:p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shadow-2xs">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900">
                        Recurring Payment / Retainer Fee Setup
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Automatically generates active billing invoices in Fees Tracking module.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="text-slate-700 block mb-1 text-xs font-bold">Billing Cycle</label>
                    <select
                      value={newClient.billingCycle}
                      onChange={e => setNewClient({...newClient, billingCycle: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs cursor-pointer shadow-2xs font-bold text-slate-800"
                    >
                      <option value="Monthly">Monthly Retainer</option>
                      <option value="Quarterly">Quarterly Retainer</option>
                      <option value="Yearly">Yearly Contract</option>
                      <option value="One-Time">One-Time Fee</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1 text-xs font-bold">Retainer Amount (₹)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 15000"
                      value={newClient.feeAmount}
                      onChange={e => setNewClient({...newClient, feeAmount: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs font-bold text-slate-900 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1 text-xs font-bold">Billing Start / Due Date</label>
                    <input 
                      type="date"
                      value={newClient.billingStartDate}
                      onChange={e => setNewClient({...newClient, billingStartDate: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs shadow-2xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 -mx-6 -mb-6 mt-2">
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
                  <CheckCircle className="w-4 h-4" />
                  <span>Save Client & Generate Billing</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* BULK CLIENT IMPORT & FORMAT CONFIGURATION MODAL */}
      <BulkClientsModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onImportSuccess={(newClients) => {
          if (Array.isArray(newClients) && newClients.length > 0) {
            setClients(prev => {
              const existingIds = new Set(prev.map(c => c.id || c.name));
              const mappedNew = newClients.map(c => ({
                ...c,
                tradeName: c.trade_name || c.tradeName || c.name,
                fileNo: c.file_no || c.fileNo || '',
                category: c.category || 'Pvt Ltd',
                pan: c.pan || '',
                gst: c.gst || '',
                phone: c.phone || '',
                email: c.email || '',
                attachedDoc: c.attached_doc,
                attachedDocs: Array.isArray(c.attached_docs) ? c.attached_docs : [],
                paymentHistory: c.payment_history || [],
                address: c.client_address || c.address || '',
                feeAmount: Number(c.fee_amount || c.feeAmount || 0),
                billingCycle: c.billing_cycle || c.billingCycle || 'Monthly',
                feeType: c.fee_type || c.feeType || 'Retainer Fee',
                billingStartDate: c.billing_start_date || c.billingStartDate || '',
                serviceScope: c.service_scope || c.serviceScope || '',
                totalBilled: Number(c.fee_amount || c.feeAmount || 0),
                totalPaid: 0,
                pendingBalance: Number(c.fee_amount || c.feeAmount || 0),
                clientFeeItems: [],
                clientReceiptItems: [],
                createdAt: c.created_at || new Date().toISOString()
              })).filter(c => !existingIds.has(c.id));

              const updatedList = [...mappedNew, ...prev];
              localStorage.setItem('taxpro_cached_clients', JSON.stringify(updatedList));
              return updatedList;
            });
          }
          fetchClientsAndFinancials();
        }}
        onShowToast={onShowToast}
      />

      {/* DEDICATED EDIT CLIENT MODAL */}
      {isEditingClient && clientEditForm && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) { setIsEditingClient(false); setClientEditForm(null); } }}
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-outfit text-slate-900 tracking-tight">
                    Edit Client: {clientEditForm.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update profile, recurring retainers, compliance fees & KYC files
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => { setIsEditingClient(false); setClientEditForm(null); }} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); saveEditClient(); }} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs font-semibold overscroll-contain chat-custom-scrollbar">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Column 1 */}
                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className="text-slate-700 block mb-1">Legal Client Name <span className="text-rose-500">*</span></label>
                    <input 
                      type="text" 
                      required 
                      value={clientEditForm.name || ''} 
                      onChange={e => setClientEditForm({...clientEditForm, name: e.target.value})} 
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs font-semibold text-slate-900 shadow-2xs" 
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1">Trade Name (Optional)</label>
                    <input 
                      type="text" 
                      value={clientEditForm.tradeName || ''} 
                      onChange={e => setClientEditForm({...clientEditForm, tradeName: e.target.value})} 
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs shadow-2xs" 
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1">Entity Category</label>
                    <select
                      value={clientEditForm.category || 'Pvt Ltd'}
                      onChange={e => setClientEditForm({...clientEditForm, category: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs cursor-pointer shadow-2xs"
                    >
                      <option value="Pvt Ltd">Pvt Ltd Company</option>
                      <option value="Public Ltd">Public Ltd Company</option>
                      <option value="LLP">Limited Liability (LLP)</option>
                      <option value="Partnership">Partnership Firm</option>
                      <option value="Proprietorship">Proprietorship</option>
                      <option value="Individual">Individual / Salaried</option>
                      <option value="Trust/Society">Trust / Society / NGO</option>
                    </select>
                  </div>

                  {/* RECURRING PLAN EDIT */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col gap-2 shadow-2xs">
                    <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                      Recurring Payment / Retainer Fee Plan
                    </h4>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-700 block mb-1">Billing Cycle</label>
                        <select
                          value={clientEditForm.billingCycle || 'Monthly'}
                          onChange={e => setClientEditForm({...clientEditForm, billingCycle: e.target.value})}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs cursor-pointer shadow-2xs font-bold"
                        >
                          <option value="Monthly">Monthly Retainer</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="Yearly">Yearly Contract</option>
                          <option value="One-Time">One-Time Fee</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-700 block mb-1">Amount (₹)</label>
                        <input 
                          type="number" 
                          value={clientEditForm.feeAmount || ''}
                          onChange={e => setClientEditForm({...clientEditForm, feeAmount: e.target.value})}
                          placeholder="e.g. 15000"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs font-bold text-slate-900 shadow-2xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-700 block mb-1">Billing Start / Due Date</label>
                      <input 
                        type="date"
                        value={clientEditForm.billingStartDate || ''}
                        onChange={e => setClientEditForm({...clientEditForm, billingStartDate: e.target.value})}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs shadow-2xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1">Email Address</label>
                    <input 
                      type="email" 
                      value={clientEditForm.email || ''} 
                      onChange={e => setClientEditForm({...clientEditForm, email: e.target.value})} 
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 text-xs shadow-2xs" 
                    />
                  </div>
                </div>

                {/* Column 2 */}
                <div className="flex flex-col gap-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-700 block mb-1">PAN Number</label>
                      <input 
                        type="text" 
                        value={clientEditForm.pan || ''} 
                        onChange={e => setClientEditForm({...clientEditForm, pan: e.target.value.toUpperCase()})} 
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 font-mono text-xs shadow-2xs" 
                      />
                    </div>
                    <div>
                      <label className="text-slate-700 block mb-1">GSTIN</label>
                      <input 
                        type="text" 
                        value={clientEditForm.gst || ''} 
                        onChange={e => setClientEditForm({...clientEditForm, gst: e.target.value.toUpperCase()})} 
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 font-mono text-xs shadow-2xs" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-700 block mb-1">Mobile / Phone</label>
                      <input 
                        type="text" 
                        value={clientEditForm.phone || ''} 
                        onChange={e => setClientEditForm({...clientEditForm, phone: e.target.value})} 
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 font-mono text-xs shadow-2xs" 
                      />
                    </div>
                    <div>
                      <label className="text-slate-700 block mb-1">File No / Cust ID</label>
                      <input 
                        type="text" 
                        value={clientEditForm.fileNo || ''} 
                        onChange={e => setClientEditForm({...clientEditForm, fileNo: e.target.value})} 
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 font-mono text-xs shadow-2xs" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1">Business Address</label>
                    <textarea 
                      rows="2" 
                      value={clientEditForm.address || ''} 
                      onChange={e => setClientEditForm({...clientEditForm, address: e.target.value})} 
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 min-h-[60px] text-xs resize-none shadow-2xs" 
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1">KYC & Related Documents</label>
                    <div className="border border-dashed border-slate-300 rounded-2xl p-3 bg-white hover:bg-slate-50 transition-colors shadow-2xs">
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
                        className="block w-full text-xs text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" 
                      />

                      {clientEditForm.attachedDocs && clientEditForm.attachedDocs.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {clientEditForm.attachedDocs.map((doc, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-bold">
                              <FileText className="w-3 h-3 text-indigo-500" />
                              <span className="truncate max-w-[120px]">{doc}</span>
                              <button 
                                type="button" 
                                onClick={() => setClientEditForm(prev => ({ ...prev, attachedDocs: prev.attachedDocs.filter((_, i) => i !== idx) }))}
                                className="text-slate-400 hover:text-rose-500 cursor-pointer ml-0.5"
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

              {/* Bottom Actions */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 -mx-6 -mb-6 mt-3">
                <button 
                  type="button" 
                  onClick={() => { setIsEditingClient(false); setClientEditForm(null); }} 
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
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
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:static print:bg-transparent overflow-y-auto"
        >
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden client-print-document print:border-none print:shadow-none print:max-w-full print:max-h-none print:overflow-visible my-auto animate-modal-smooth">
            
            {/* OFFICIAL PRINT LETTERHEAD HEADER */}
            <div className="hidden print:block border-b-2 border-gray-900 pb-4 mb-6 p-6">
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
                    Generated: {formatDate(new Date())}
                  </div>
                  <div className="text-[10px] font-bold uppercase text-emerald-800 mt-0.5">
                    Account Status: {activeClientStat.status || 'Active'}
                  </div>
                </div>
              </div>
            </div>

            {/* STICKY TOP CONTROLS BAR (PRINT HIDDEN) */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 print:hidden">
              <button 
                type="button" 
                onClick={() => setActiveClientStat(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-2xs"
                title="Go Back"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
                <span>Back to Directory</span>
              </button>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => startEditClientCard(activeClientStat)}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                >
                  <Edit2 className="w-3.5 h-3.5 text-indigo-600" /> Edit Profile
                </button>
                <button 
                  onClick={(e) => handlePrintSpecificClient(e, activeClientStat)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  title="Print this client's official record & ledger"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Dossier
                </button>
                <button 
                  onClick={(e) => handleRequestDeleteClient(e, activeClientStat)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200"
                  title="Permanently delete this client account"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Delete
                </button>
                <button 
                  onClick={() => setActiveClientStat(null)} 
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* SMOOTH SCROLLABLE MODAL BODY */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 overscroll-contain chat-custom-scrollbar print:p-0 print:space-y-4 print:overflow-visible">
              
              {/* Client Profile Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 print:text-gray-600">
                     <Users className="w-3.5 h-3.5 text-indigo-600 print:hidden" /> Client Master Account
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-outfit leading-tight mb-1 print:text-black">
                    {activeClientStat.name}
                  </h3>
                  <div className="text-sm font-bold text-slate-500 mb-1">T/A: {activeClientStat.tradeName || activeClientStat.name}</div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                      activeClientStat.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {activeClientStat.status}
                    </span>
                    {activeClientStat.feeAmount > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-indigo-600" /> {formatINR(activeClientStat.feeAmount)} / {activeClientStat.billingCycle} Plan
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Info Cards Grid (Clean Unified Light Slate) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:grid-cols-2 print:gap-4">
                 <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl print:bg-white print:border-gray-300">
                   <div className="text-[9px] font-black text-slate-400 tracking-widest uppercase mb-1 print:text-gray-600">Physical File No</div>
                   <div className="font-mono font-bold text-indigo-700 print:text-gray-900">{activeClientStat.fileNo || 'N/A'}</div>
                 </div>
                 <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl print:bg-white print:border-gray-300">
                   <div className="text-[9px] font-black text-slate-400 tracking-widest uppercase mb-1 print:text-gray-600">PAN Detail</div>
                   <div className="font-mono font-bold text-slate-900">{activeClientStat.pan || 'N/A'}</div>
                 </div>
                 <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl print:bg-white print:border-gray-300">
                   <div className="text-[9px] font-black text-slate-400 tracking-widest uppercase mb-1 print:text-gray-600">GSTIN</div>
                   <div className="font-mono font-bold text-slate-900">{activeClientStat.gst || 'N/A'}</div>
                 </div>
                 <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl col-span-2 md:col-span-1 print:bg-white print:border-gray-300">
                   <div className="text-[9px] font-black text-slate-400 tracking-widest uppercase mb-1 print:text-gray-600">Contact Details</div>
                   <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 opacity-50 print:hidden" /> {activeClientStat.phone || 'N/A'}</div>
                   <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 truncate"><Mail className="w-3.5 h-3.5 opacity-50 print:hidden" /> {activeClientStat.email || 'N/A'}</div>
                 </div>
                 <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl col-span-2 md:col-span-4 print:col-span-2 print:bg-white print:border-gray-300">
                   <div className="text-[9px] font-black text-slate-400 tracking-widest uppercase mb-1 print:text-gray-600">Registered Business Address</div>
                   <div className="text-xs font-semibold text-slate-800">{activeClientStat.address || activeClientStat.client_address || 'Address not registered'}</div>
                 </div>
              </div>

              {/* FINANCIAL DOSSIER & BALANCE (CLEAN UNIFIED THEME, NOT DARK BLUE) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-2xs print:bg-white print:border-gray-400 print:p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-indigo-600 print:hidden" />
                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-900">
                      Client Total Financial Dossier & Balance
                    </h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 print:bg-gray-100 print:text-gray-900 print:border-gray-300">
                    Live Ledger Synchronized
                  </span>
                </div>

                {/* 3 Interactive Financial Dossier Cards (Click to filter) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  
                  {/* 1. Lifetime Billed Card */}
                  <button
                    type="button"
                    onClick={() => setDossierTab(prev => prev === 'BILLED' ? 'ALL' : 'BILLED')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer group ${
                      dossierTab === 'BILLED'
                        ? 'bg-indigo-50 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                        : 'bg-white hover:bg-slate-100/80 border-slate-200 shadow-2xs'
                    }`}
                    title="Click to view all billed invoices and dues"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-black uppercase block">
                        Lifetime Billed
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold border border-slate-200">
                        {clientTransactions.filter(i => i.type === 'INVOICE').length} Bills
                      </span>
                    </div>
                    <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-1 block">
                      {formatINR(activeClientStat.totalBilled)}
                    </span>
                    <span className="text-[10px] text-indigo-600 font-bold mt-1 block">
                      {dossierTab === 'BILLED' ? '✓ Filter Active' : 'Click to filter →'}
                    </span>
                  </button>

                  {/* 2. Total Paid Card */}
                  <button
                    type="button"
                    onClick={() => setDossierTab(prev => prev === 'PAID' ? 'ALL' : 'PAID')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer group ${
                      dossierTab === 'PAID'
                        ? 'bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                        : 'bg-white hover:bg-slate-100/80 border-slate-200 shadow-2xs'
                    }`}
                    title="Click to view all payment receipts received"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-emerald-700 font-black uppercase block">
                        Total Paid
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-mono font-bold border border-emerald-200">
                        {clientTransactions.filter(i => i.type === 'PAYMENT' || i.status === 'Paid').length} Receipts
                      </span>
                    </div>
                    <span className="text-xl sm:text-2xl font-black font-mono text-emerald-700 mt-1 block">
                      {formatINR(activeClientStat.totalPaid)}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold mt-1 block">
                      {dossierTab === 'PAID' ? '✓ Filter Active' : 'Click to filter →'}
                    </span>
                  </button>

                  {/* 3. Pending Balance Card */}
                  <button
                    type="button"
                    onClick={() => setDossierTab(prev => prev === 'PENDING' ? 'ALL' : 'PENDING')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer group ${
                      dossierTab === 'PENDING'
                        ? 'bg-rose-50 border-rose-500 shadow-md ring-2 ring-rose-500/20'
                        : 'bg-white hover:bg-slate-100/80 border-slate-200 shadow-2xs'
                    }`}
                    title="Click to view all outstanding pending dues"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-rose-700 font-black uppercase block">
                        Pending Balance
                      </span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                        activeClientStat.pendingBalance > 0 ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {clientTransactions.filter(i => i.pending > 0 && i.status !== 'Paid').length} Dues
                      </span>
                    </div>
                    <span className={`text-xl sm:text-2xl font-black font-mono mt-1 block ${
                      activeClientStat.pendingBalance > 0 ? 'text-rose-600' : 'text-slate-400'
                    }`}>
                      {formatINR(activeClientStat.pendingBalance)}
                    </span>
                    <span className={`text-[10px] font-bold mt-1 block ${activeClientStat.pendingBalance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {dossierTab === 'PENDING' ? '✓ Filter Active' : 'Click to filter →'}
                    </span>
                  </button>

                </div>
              </div>

              {/* LEDGER FILTER CONTROLS (MONTH, YEAR, DATE RANGE & SEARCH) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 print:hidden flex flex-col gap-3 shadow-2xs">
                
                {/* Row 1: Tab Switcher & Quick Reset */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mr-1">
                      <Filter className="w-3.5 h-3.5 text-indigo-600" />
                      View:
                    </span>
                    
                    <button
                      type="button"
                      onClick={() => setDossierTab('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        dossierTab === 'ALL'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      All ({clientTransactions.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setDossierTab('BILLED')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        dossierTab === 'BILLED'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      Invoices ({clientTransactions.filter(i => i.type === 'INVOICE').length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setDossierTab('PAID')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        dossierTab === 'PAID'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      Paid ({clientTransactions.filter(i => i.type === 'PAYMENT' || i.status === 'Paid').length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setDossierTab('PENDING')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        dossierTab === 'PENDING'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      Pending ({clientTransactions.filter(i => i.pending > 0 && i.status !== 'Paid').length})
                    </button>
                  </div>

                  {(dossierTab !== 'ALL' || dossierMonth !== 'ALL' || dossierYear !== 'ALL' || dossierFromDate || dossierToDate || dossierSearch) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDossierTab('ALL');
                        setDossierMonth('ALL');
                        setDossierYear('ALL');
                        setDossierFromDate('');
                        setDossierToDate('');
                        setDossierSearch('');
                      }}
                      className="flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-800 font-bold transition-colors cursor-pointer self-end sm:self-auto"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset Filters
                    </button>
                  )}
                </div>

                {/* Row 2: Month Selector, Year Selector, Date Range & Search */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200">
                  
                  {/* Month Dropdown */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Month</label>
                    <select
                      value={dossierMonth}
                      onChange={e => setDossierMonth(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-600 cursor-pointer shadow-2xs"
                    >
                      <option value="ALL">🗓️ All Months (Jan - Dec)</option>
                      <option value="01">01 - January</option>
                      <option value="02">02 - February</option>
                      <option value="03">03 - March</option>
                      <option value="04">04 - April</option>
                      <option value="05">05 - May</option>
                      <option value="06">06 - June</option>
                      <option value="07">07 - July</option>
                      <option value="08">08 - August</option>
                      <option value="09">09 - September</option>
                      <option value="10">10 - October</option>
                      <option value="11">11 - November</option>
                      <option value="12">12 - December</option>
                    </select>
                  </div>

                  {/* Year Dropdown */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Year</label>
                    <select
                      value={dossierYear}
                      onChange={e => setDossierYear(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-600 cursor-pointer shadow-2xs"
                    >
                      <option value="ALL">📅 All Years</option>
                      <option value="2026">2026 (Current Period)</option>
                      <option value="2025">2025</option>
                      <option value="2024">2024</option>
                    </select>
                  </div>

                  {/* Date Range (From - To) */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">From Date</label>
                      <input
                        type="date"
                        value={dossierFromDate}
                        onChange={e => setDossierFromDate(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded-xl text-[11px] font-mono font-medium text-slate-800 outline-none focus:border-indigo-600 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">To Date</label>
                      <input
                        type="date"
                        value={dossierToDate}
                        onChange={e => setDossierToDate(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded-xl text-[11px] font-mono font-medium text-slate-800 outline-none focus:border-indigo-600 shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Search Text */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Search Ledger</label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Invoice, scope, mode..."
                        value={dossierSearch}
                        onChange={e => setDossierSearch(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 shadow-2xs"
                      />
                    </div>
                  </div>

                </div>

                {/* Filtered Active Scope Banner */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs font-mono font-bold text-slate-600">
                  <span className="flex items-center gap-1.5 font-sans font-bold text-indigo-700">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Showing {filteredClientTransactions.length} of {clientTransactions.length} records
                  </span>
                  <div className="flex items-center gap-3">
                    <span>Billed: <strong className="text-slate-900">{formatINR(dossierFilteredBilled)}</strong></span>
                    <span className="text-emerald-700">Paid: <strong>{formatINR(dossierFilteredPaid)}</strong></span>
                    <span className="text-rose-600">Due: <strong>{formatINR(dossierFilteredPending)}</strong></span>
                  </div>
                </div>

              </div>

              {/* DETAILED TRANSACTION LEDGER STATEMENT */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">
                  <span className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-indigo-600 print:hidden" />
                    Complete Client Ledger & Payments History
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {filteredClientTransactions.length} Records Found
                  </span>
                </div>
                
                <div className="space-y-2.5">
                  {filteredClientTransactions.length > 0 ? (
                    filteredClientTransactions.map((tx, idx) => (
                      <div 
                        key={tx.id || idx} 
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border text-xs transition-all gap-2 bg-white print:border-gray-300 ${
                          tx.type === 'PAYMENT'
                            ? 'border-emerald-200 hover:border-emerald-300 shadow-2xs'
                            : (tx.pending > 0 ? 'border-rose-200 hover:border-rose-300 shadow-2xs' : 'border-slate-200 hover:border-slate-300 shadow-2xs')
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              tx.type === 'PAYMENT' 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                : (tx.pending > 0 ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-800 border border-slate-200')
                            }`}>
                              {tx.type === 'PAYMENT' ? '✓ Payment Received' : (tx.pending > 0 ? '⚠ Invoice Billed / Due' : '✓ Invoiced & Settled')}
                            </span>
                            <span className="font-mono font-bold text-slate-900 text-xs truncate">
                              {tx.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-600 font-mono flex-wrap">
                            <span>🗓️ {formatDate(tx.date)}</span>
                            <span>• Ref: <strong className="text-slate-900">{tx.invoiceNo}</strong></span>
                            <span>• Mode: <strong>{tx.method}</strong></span>
                            {tx.notes && tx.notes !== tx.title && (
                              <span className="text-slate-500 font-sans italic truncate max-w-xs">({tx.notes})</span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                          {tx.type === 'PAYMENT' ? (
                            <div className="font-mono font-black text-sm sm:text-base text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 print:bg-transparent print:border-none print:text-gray-900">
                              + {formatINR(tx.amount)}
                            </div>
                          ) : (
                            <div>
                              <div className="font-mono font-black text-sm sm:text-base text-slate-900">
                                {formatINR(tx.amount)}
                              </div>
                              {tx.pending > 0 ? (
                                <span className="text-[10px] font-bold text-rose-600 block">
                                  Due: {formatINR(tx.pending)}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-700 block">
                                  ✓ Fully Settled
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-6">
                      <Receipt className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                      <p className="font-bold text-slate-700 mb-1">No transaction records found for the selected filter.</p>
                      <p className="text-slate-500 text-[11px] mb-3">Try adjusting your month, year, or search criteria.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setDossierTab('ALL');
                          setDossierMonth('ALL');
                          setDossierYear('ALL');
                          setDossierFromDate('');
                          setDossierToDate('');
                          setDossierSearch('');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Attached KYC Documents */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 print:bg-white print:border-gray-300">
                <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1 print:text-gray-600">Attached KYC & Verification Documents</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {activeClientStat.attachedDocs && activeClientStat.attachedDocs.length > 0 ? (
                    activeClientStat.attachedDocs.map((doc, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs print:border-gray-300 print:text-gray-900">
                        <FileText className="w-3.5 h-3.5 text-indigo-500 print:hidden" />
                        <span>{doc}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No attached files uploaded.</span>
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

      {/* PROPER DELETE CLIENT CONFIRMATION MODAL */}
      {clientToDelete && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget && !isDeletingClient) setClientToDelete(null); }}
          className="fixed inset-0 z-[99999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 print-hidden animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-rose-900 via-red-950 to-rose-900 text-white p-5 flex items-center justify-between border-b border-rose-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300 shadow-xs">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-outfit text-white">
                    Delete Client Account
                  </h3>
                  <p className="text-xs text-rose-200/80">
                    Confirm removal from Client Directory
                  </p>
                </div>
              </div>
              <button 
                onClick={() => !isDeletingClient && setClientToDelete(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col gap-4">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-900">
                  <p className="font-bold mb-1">Permanent Removal</p>
                  <p className="text-rose-700 leading-relaxed">
                    Are you sure you want to delete <strong>{clientToDelete.name}</strong>? This action will remove the client profile and associated records from your directory.
                  </p>
                </div>
              </div>

              {/* Client Summary Box */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-sans font-bold">Legal Name:</span>
                  <span className="font-bold text-gray-900">{clientToDelete.name}</span>
                </div>
                {clientToDelete.tradeName && clientToDelete.tradeName !== clientToDelete.name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-sans font-bold">Trade Name:</span>
                    <span className="font-bold text-gray-800">{clientToDelete.tradeName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500 font-sans font-bold">PAN / GSTIN:</span>
                  <span className="font-bold text-gray-800">{clientToDelete.pan || 'N/A'} / {clientToDelete.gst || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-sans font-bold">File No:</span>
                  <span className="font-bold text-indigo-700">{clientToDelete.fileNo || 'N/A'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setClientToDelete(null)}
                  disabled={isDeletingClient}
                  className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteClient}
                  disabled={isDeletingClient}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeletingClient ? 'Deleting Client...' : 'Yes, Delete Client'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
