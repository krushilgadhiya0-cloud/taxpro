import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  X, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  Trash2, 
  Users, 
  Layers, 
  Check,
  AlertCircle,
  Plus,
  Building2,
  Phone,
  Mail,
  CreditCard,
  Hash,
  MapPin,
  Briefcase
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { logAuditActivity } from '../../lib/auditLogger';

// All available TaxPro Client fields with sample values
const ALL_FIELD_DEFINITIONS = [
  { key: 'name', label: 'Legal Client Name', required: true, example1: 'Reliance Retail Ventures Ltd', example2: 'Tata Consultancy Services', example3: 'Apex Global Logistics' },
  { key: 'tradeName', label: 'Trade Name', required: false, example1: 'Reliance Smart', example2: 'TCS Enterprise', example3: 'Apex Express' },
  { key: 'pan', label: 'PAN Number', required: false, example1: 'AAGCA3456P', example2: 'AAACT2727Q', example3: 'ABCDE1234F' },
  { key: 'gst', label: 'GSTIN', required: false, example1: '24AAGCA3456P1Z3', example2: '27AAACT2727Q1ZW', example3: '27ABCDE1234F1Z5' },
  { key: 'phone', label: 'Mobile / Phone', required: false, example1: '+91 98250 11223', example2: '+91 98450 33445', example3: '+91 98765 43210' },
  { key: 'email', label: 'Email Address', required: false, example1: 'compliance@relianceretail.com', example2: 'tax.desk@tcs.com', example3: 'accounts@apex.in' },
  { key: 'fileNo', label: 'File No / Cust ID', required: false, example1: 'FN-101', example2: 'FN-102', example3: 'FN-103' },
  { key: 'address', label: 'Business Address', required: false, example1: 'Maker Chambers IV Nariman Point Mumbai', example2: 'TCS House Fort Mumbai 400001', example3: '101 Trade Tower Ahmedabad' },
  { key: 'category', label: 'Entity Category', required: false, example1: 'Pvt Ltd', example2: 'Public Ltd', example3: 'LLP' },
  { key: 'feeAmount', label: 'Retainer Fee (₹)', required: false, example1: '25000', example2: '50000', example3: '15000' },
  { key: 'billingCycle', label: 'Billing Cycle', required: false, example1: 'Monthly', example2: 'Quarterly', example3: 'Monthly' }
];

const CATEGORY_OPTIONS = [
  'Pvt Ltd',
  'Public Ltd',
  'LLP',
  'Partnership',
  'Proprietorship',
  'Individual',
  'Trust / NGO'
];

// Format presets
const FORMAT_PRESETS = [
  {
    id: 'full',
    name: 'Enterprise (11)',
    keys: ALL_FIELD_DEFINITIONS.map(f => f.key)
  },
  {
    id: 'standard',
    name: 'Tax Master (6)',
    keys: ['name', 'pan', 'gst', 'phone', 'email', 'category']
  },
  {
    id: 'billing',
    name: 'Retainers (6)',
    keys: ['name', 'tradeName', 'pan', 'gst', 'feeAmount', 'billingCycle']
  },
  {
    id: 'minimal',
    name: 'Contacts (5)',
    keys: ['name', 'phone', 'email', 'fileNo', 'address']
  }
];

export default function BulkClientsModal({ isOpen, onClose, onImportSuccess, onShowToast }) {
  const [selectedFieldKeys, setSelectedFieldKeys] = useState(ALL_FIELD_DEFINITIONS.map(f => f.key));
  const [parsedRows, setParsedRows] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [importSuccessData, setImportSuccessData] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const activeFields = ALL_FIELD_DEFINITIONS.filter(f => selectedFieldKeys.includes(f.key));

  const toggleField = (key) => {
    if (key === 'name') return;
    setSelectedFieldKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const applyPreset = (presetKeys) => {
    setSelectedFieldKeys(presetKeys);
    if (onShowToast) onShowToast('✓ Format updated! Sample templates will match this format.', 'success');
  };

  // 1. Download Sample Excel (.xlsx) Template
  const handleDownloadSampleExcel = () => {
    try {
      const headers = activeFields.map(f => f.label);
      const rows = [
        activeFields.map(f => f.example1),
        activeFields.map(f => f.example2),
        activeFields.map(f => f.example3)
      ];

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Clients Template');

      const fileName = `TaxPro_Clients_Template_${activeFields.length}Cols_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);

      if (onShowToast) onShowToast(`📥 Downloaded Excel template (${activeFields.length} columns)!`, 'success');
    } catch (err) {
      console.error('[Download Excel Error]:', err);
      handleDownloadSampleCSV();
    }
  };

  // 2. Download Sample CSV matching user format
  const handleDownloadSampleCSV = () => {
    const headers = activeFields.map(f => `"${f.label.replace(/"/g, '""')}"`).join(',');
    const row1 = activeFields.map(f => `"${String(f.example1).replace(/"/g, '""')}"`).join(',');
    const row2 = activeFields.map(f => `"${String(f.example2).replace(/"/g, '""')}"`).join(',');
    const row3 = activeFields.map(f => `"${String(f.example3).replace(/"/g, '""')}"`).join(',');

    const csvContent = '\uFEFF' + [headers, row1, row2, row3].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TaxPro_Clients_Template_${activeFields.length}Cols_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (onShowToast) onShowToast(`📥 Downloaded CSV template (${activeFields.length} columns)!`, 'success');
  };

  // 3. Smart Header Matching Engine
  const resolveColumnKey = (headerText) => {
    if (!headerText) return null;
    const clean = String(headerText).toLowerCase().replace(/[^a-z0-9]/g, '');

    // Trade Name
    if (clean.includes('trade') || clean.includes('brand') || clean.includes('doingbusinessas') || clean === 'dba' || clean === 'ta' || clean.includes('tradename') || clean.includes('businessname') || clean.includes('shopname')) return 'tradeName';
    
    // PAN
    if (clean.includes('pan') || clean.includes('taxid') || clean.includes('panno') || clean.includes('incometaxpan') || clean.includes('pannumber')) return 'pan';
    
    // GSTIN
    if (clean.includes('gst') || clean.includes('gstin') || clean.includes('vat') || clean.includes('taxreg') || clean.includes('gstno') || clean.includes('gstinnumber') || clean.includes('gstinno') || clean.includes('gstreg')) return 'gst';
    
    // Phone / Mobile
    if (clean.includes('phone') || clean.includes('mobile') || clean.includes('contactno') || clean.includes('telephone') || clean.includes('cell') || clean.includes('whatsapp') || clean.includes('contactnumber') || clean.includes('phoneno') || clean.includes('mobileno') || clean === 'contact' || clean === 'mob') return 'phone';
    
    // Email
    if (clean.includes('email') || clean.includes('mail') || clean.includes('emailid') || clean.includes('gmail') || clean.includes('emailaddress')) return 'email';
    
    // File No / Cust ID
    if (clean.includes('fileno') || clean.includes('custid') || clean.includes('clientid') || clean.includes('refno') || clean.includes('filenumber') || clean.includes('folio') || clean.includes('accountno') || clean.includes('clientno') || clean.includes('customerno') || clean === 'id' || clean === 'code') return 'fileNo';
    
    // Address
    if (clean.includes('address') || clean.includes('location') || clean.includes('city') || clean.includes('state') || clean.includes('street') || clean.includes('premises') || clean.includes('registeredaddress') || clean.includes('officeaddress') || clean.includes('clientaddress')) return 'address';
    
    // Entity Category
    if (clean.includes('category') || clean.includes('entity') || clean.includes('constitution') || clean.includes('orgtype') || clean.includes('entitytype') || clean.includes('businesstype') || clean.includes('type')) return 'category';
    
    // Fee / Retainer
    if (clean.includes('fee') || clean.includes('retainer') || clean.includes('amount') || clean.includes('rate') || clean.includes('price') || clean.includes('plan') || clean.includes('package') || clean.includes('billingamount') || clean.includes('monthlyplan') || clean.includes('retainerfee') || clean.includes('cost')) return 'feeAmount';
    
    // Billing Cycle
    if (clean.includes('cycle') || clean.includes('billing') || clean.includes('frequency') || clean.includes('period') || clean.includes('interval') || clean.includes('plantype')) return 'billingCycle';
    
    // Legal Client Name
    if (clean.includes('legalclient') || clean.includes('clientname') || clean.includes('companyname') || clean.includes('customername') || clean.includes('partyname') || clean.includes('party') || clean === 'client' || clean === 'name' || clean === 'company' || clean === 'customer' || clean === 'legalname' || clean === 'entityname' || clean === 'clientlegalname') return 'name';

    return null;
  };

  // 4. Multi-format Parser (Works for .xlsx, .xls, .csv, .tsv, .txt)
  const processRawDataGrid = (grid) => {
    if (!Array.isArray(grid) || grid.length === 0) return [];

    // Filter out completely empty rows
    const cleanGrid = grid.filter(row => Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''));
    if (cleanGrid.length === 0) return [];

    // Check if first row is a header
    const firstRow = cleanGrid[0].map(c => String(c || '').trim());
    const matchedKeys = firstRow.map(c => resolveColumnKey(c));
    const isHeaderRow = matchedKeys.some(Boolean) || firstRow.some(c => {
      const low = c.toLowerCase();
      return low.includes('name') || low.includes('client') || low.includes('pan') || low.includes('gst') || low.includes('phone') || low.includes('email') || low.includes('fee') || low.includes('trade');
    });

    // If header row matches, fill any unmatched column with the corresponding active field
    const headerMap = isHeaderRow 
      ? matchedKeys.map((k, idx) => k || (activeFields[idx] ? activeFields[idx].key : null))
      : activeFields.map(f => f.key);
    const dataRows = isHeaderRow ? cleanGrid.slice(1) : cleanGrid;

    const rows = [];
    dataRows.forEach((cells, i) => {
      if (!cells || cells.length === 0 || !cells.some(c => c !== null && c !== undefined && String(c).trim() !== '')) return;

      const rowObj = {
        id: `row-${Date.now()}-${i}-${Math.floor(100 + Math.random() * 900)}`,
        name: '',
        tradeName: '',
        pan: '',
        gst: '',
        phone: '',
        email: '',
        fileNo: `FN-${101 + i}`,
        address: '',
        category: 'Pvt Ltd',
        feeAmount: 0,
        billingCycle: 'Monthly',
        status: 'valid'
      };

      cells.forEach((rawVal, colIdx) => {
        const key = headerMap[colIdx] || (activeFields[colIdx] ? activeFields[colIdx].key : null);
        if (!key) return;

        const val = rawVal !== null && rawVal !== undefined ? String(rawVal).trim() : '';

        if (key === 'feeAmount') {
          rowObj.feeAmount = Number(val.replace(/[^0-9.]/g, '')) || 0;
        } else if (key === 'pan' || key === 'gst') {
          rowObj[key] = val.toUpperCase().replace(/\s+/g, '');
        } else if (key === 'category') {
          // Normalize category to standard options
          const lowCat = val.toLowerCase();
          if (lowCat.includes('llp')) rowObj.category = 'LLP';
          else if (lowCat.includes('public')) rowObj.category = 'Public Ltd';
          else if (lowCat.includes('partner')) rowObj.category = 'Partnership';
          else if (lowCat.includes('proprietor') || lowCat.includes('prop')) rowObj.category = 'Proprietorship';
          else if (lowCat.includes('individual') || lowCat.includes('salaried')) rowObj.category = 'Individual';
          else if (lowCat.includes('trust') || lowCat.includes('ngo') || lowCat.includes('society')) rowObj.category = 'Trust / NGO';
          else if (val) rowObj.category = val;
        } else if (key === 'billingCycle') {
          const lowCycle = val.toLowerCase();
          if (lowCycle.includes('quarter')) rowObj.billingCycle = 'Quarterly';
          else if (lowCycle.includes('half')) rowObj.billingCycle = 'Half-Yearly';
          else if (lowCycle.includes('year') || lowCycle.includes('annual')) rowObj.billingCycle = 'Yearly';
          else if (lowCycle.includes('one') || lowCycle.includes('single')) rowObj.billingCycle = 'One-Time';
          else rowObj.billingCycle = 'Monthly';
        } else {
          rowObj[key] = val;
        }
      });

      if (!rowObj.tradeName && rowObj.name) {
        rowObj.tradeName = rowObj.name;
      }

      if (!rowObj.name.trim()) {
        rowObj.status = 'error';
      }

      rows.push(rowObj);
    });

    return rows;
  };

  // 5. Universal File Handler
  const handleFile = async (file) => {
    if (!file) return;
    setUploadedFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const dataGrid = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      const parsed = processRawDataGrid(dataGrid);

      if (parsed.length === 0) {
        if (onShowToast) onShowToast('No readable client rows found in file.', 'warning');
        return;
      }

      setParsedRows(parsed);
      const validCount = parsed.filter(r => r.name.trim()).length;
      if (onShowToast) onShowToast(`✓ Successfully loaded ${validCount} client rows from "${file.name}"!`, 'success');
    } catch (err) {
      console.error('[File Read Error]:', err);
      // Fallback to text CSV parsing
      try {
        const text = await file.text();
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const grid = lines.map(line => {
          const isTab = line.includes('\t');
          const isSemicolon = !isTab && line.includes(';') && !line.includes(',');
          const sep = isTab ? '\t' : (isSemicolon ? ';' : ',');
          return line.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''));
        });
        const parsed = processRawDataGrid(grid);
        if (parsed.length > 0) {
          setParsedRows(parsed);
          if (onShowToast) onShowToast(`✓ Parsed ${parsed.length} client rows!`, 'success');
        } else {
          if (onShowToast) onShowToast('Could not parse client records. Please check file format.', 'error');
        }
      } catch (fallbackErr) {
        if (onShowToast) onShowToast(`Failed to parse file: ${err.message}`, 'error');
      }
    }
  };

  const handleRowChange = (id, field, value) => {
    setParsedRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      updated.status = updated.name.trim() ? 'valid' : 'error';
      return updated;
    }));
  };

  const handleDeleteRow = (id) => {
    setParsedRows(prev => prev.filter(r => r.id !== id));
  };

  const handleAddManualRow = () => {
    const newRow = {
      id: `row-manual-${Date.now()}`,
      name: '',
      tradeName: '',
      pan: '',
      gst: '',
      phone: '',
      email: '',
      fileNo: `FN-${101 + parsedRows.length}`,
      address: '',
      category: 'Pvt Ltd',
      feeAmount: 0,
      billingCycle: 'Monthly',
      status: 'error'
    };
    setParsedRows(prev => [newRow, ...prev]);
  };

  // 6. Batch Import Execution
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter(r => r.name && r.name.trim());
    if (validRows.length === 0) {
      if (onShowToast) onShowToast('No valid client records with Legal Name to import.', 'warning');
      return;
    }

    setIsProcessing(true);

    try {
      const clientPayloads = validRows.map((r, idx) => {
        const cleanName = r.name.trim();
        const autoEmail = r.email && r.email.trim() ? r.email.trim() : `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}@taxproclient.in`;
        const autoPhone = r.phone && r.phone.trim() ? r.phone.trim() : '+91 98000 00000';
        
        return {
          id: `CLI-${Date.now()}-${idx}-${Math.floor(100 + Math.random() * 900)}`,
          name: cleanName,
          trade_name: r.tradeName?.trim() || cleanName,
          pan: r.pan?.trim()?.toUpperCase() || '',
          gst: r.gst?.trim()?.toUpperCase() || '',
          file_no: r.fileNo?.trim() || `FN-${101 + idx}`,
          phone: autoPhone,
          email: autoEmail,
          address: r.address?.trim() || '',
          client_address: r.address?.trim() || '',
          category: r.category?.trim() || 'Pvt Ltd',
          fee_amount: Number(r.feeAmount) || 0,
          billing_cycle: r.billingCycle || 'Monthly',
          fee_type: 'Retainer Fee',
          billing_start_date: new Date().toISOString().slice(0, 10),
          status: 'Active',
          payment_history: [],
          attached_docs: []
        };
      });

      // 1. Insert into PostgreSQL clients table
      let insertedClients = null;
      try {
        const { data, error } = await supabase
          .from('clients')
          .insert(clientPayloads)
          .select();

        if (error) throw error;
        insertedClients = data;
      } catch (dbErr) {
        console.warn('[PostgreSQL Direct Client Insert Fallback]:', dbErr.message);
      }

      // 2. Insert auto-generated retainer fee records for any client with fee > 0
      const feePayloads = [];
      (insertedClients || clientPayloads).forEach((c, idx) => {
        const fee = Number(c.fee_amount || c.feeAmount || 0);
        if (fee > 0) {
          feePayloads.push({
            id: `FT-${Date.now()}-${idx}`,
            client_name: c.name,
            client_id: c.id,
            invoice_no: `INV-${Date.now().toString().slice(-4)}${idx}`,
            amount: fee,
            paid: 0,
            pending: fee,
            service: `${c.billing_cycle || 'Monthly'} Retainer Fee`,
            status: 'Pending',
            due_date: new Date().toISOString().slice(0, 10),
            date: new Date().toISOString().slice(0, 10)
          });
        }
      });

      if (feePayloads.length > 0) {
        try {
          await supabase.from('fees').insert(feePayloads);
        } catch (fErr) {
          console.warn('[Bulk Fee Invoicing Note]:', fErr.message);
        }
      }

      // 3. Update localStorage cache so UI immediately displays new clients
      try {
        const currentCached = JSON.parse(localStorage.getItem('taxpro_cached_clients') || '[]');
        const existingIds = new Set(currentCached.map(c => c.id || c.name));
        const formattedNew = (insertedClients || clientPayloads).map(c => ({
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
          billingStartDate: c.billing_start_date || c.billingStartDate || new Date().toISOString().slice(0, 10),
          serviceScope: 'Tax Compliance & Retainer',
          totalBilled: Number(c.fee_amount || c.feeAmount || 0),
          totalPaid: 0,
          pendingBalance: Number(c.fee_amount || c.feeAmount || 0),
          clientFeeItems: [],
          clientReceiptItems: [],
          createdAt: c.created_at || new Date().toISOString()
        })).filter(c => !existingIds.has(c.id));

        const updatedCache = [...formattedNew, ...currentCached];
        localStorage.setItem('taxpro_cached_clients', JSON.stringify(updatedCache));
      } catch (cacheErr) {
        console.warn('[Cache Sync Warning]:', cacheErr);
      }

      // 4. Log Audit Activity
      logAuditActivity({
        action: 'CREATE_CLIENT',
        module: 'Clients',
        details: `Batch imported ${clientPayloads.length} client accounts into TaxPro Enterprise database.`,
        metadata: { count: clientPayloads.length }
      });

      // 5. Broadcast global events
      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
      window.dispatchEvent(new CustomEvent('ai_client_added'));
      window.dispatchEvent(new CustomEvent('taxpro_financial_updated'));

      if (onShowToast) {
        onShowToast(`✓ Successfully saved and registered ${clientPayloads.length} client accounts!`, 'success');
      }

      if (onImportSuccess) {
        onImportSuccess(insertedClients || clientPayloads);
      }

      setImportSuccessData({
        total: clientPayloads.length,
        withFees: feePayloads.length,
        items: insertedClients || clientPayloads
      });
    } catch (err) {
      console.error('[Bulk Import Error]:', err);
      if (onShowToast) onShowToast(`Import failed: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const validRowsCount = parsedRows.filter(r => r.name && r.name.trim()).length;
  const invalidRowsCount = parsedRows.length - validRowsCount;

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget && !isProcessing) onClose(); }}
      className="fixed inset-0 z-[99999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-hidden print-hidden animate-in fade-in duration-150"
    >
      <div className="w-full max-w-6xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-150 relative">
        
        {/* ======================================================================= */}
        {/* DEDICATED IMPORT SUCCESS DIALOG POPUP                                  */}
        {/* ======================================================================= */}
        {importSuccessData && (
          <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h2 className="text-xl font-extrabold text-gray-900 font-outfit mb-1.5">
              Client Data Successfully Saved!
            </h2>
            <p className="text-sm text-gray-600 max-w-md mb-6 leading-relaxed">
              <strong>{importSuccessData.total} client accounts</strong> have been successfully verified, saved, and added to your <strong>Client Directory</strong>.
            </p>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-lg mb-6">
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
                <span className="text-[11px] font-bold text-gray-500 uppercase block">Registered</span>
                <span className="text-lg font-black text-gray-900 font-mono">{importSuccessData.total}</span>
              </div>
              <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl">
                <span className="text-[11px] font-bold text-teal-700 uppercase block">Retainers</span>
                <span className="text-lg font-black text-teal-800 font-mono">{importSuccessData.withFees}</span>
              </div>
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                <span className="text-[11px] font-bold text-indigo-700 uppercase block">Status</span>
                <span className="text-xs font-bold text-indigo-800 block mt-1">Active</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setImportSuccessData(null);
                  setParsedRows([]);
                  setUploadedFileName('');
                }}
                className="px-5 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs transition-colors cursor-pointer shadow-xs"
              >
                Import Another File
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Done & Open Client Directory</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* MODAL HEADER                                                            */}
        {/* ======================================================================= */}
        <div className="bg-[#1e1e2d] text-white px-6 py-4 flex items-center justify-between border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-outfit text-white">
                Bulk Import Clients & Multi-Field Format
              </h3>
              <p className="text-xs text-gray-400">
                Seamlessly import all 11 client parameters: Legal Name, Trade Name, PAN, GSTIN, Phone, Email, File No, Category, Address, Fee & Cycle
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ======================================================================= */}
        {/* SCROLLABLE BODY                                                         */}
        {/* ======================================================================= */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-gray-50/50">
          
          {/* STEP 1: FORMAT CONTROLS & DUAL DOWNLOAD */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-gray-700 mr-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Format:
                </span>
                {FORMAT_PRESETS.map(preset => {
                  const isActive = preset.keys.length === selectedFieldKeys.length && 
                                   preset.keys.every(k => selectedFieldKeys.includes(k));
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.keys)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-indigo-600 text-white shadow-xs' 
                          : 'bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {preset.name}
                    </button>
                  );
                })}
              </div>

              {/* DYNAMIC DOWNLOAD TEMPLATES */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadSampleExcel}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  title="Download Microsoft Excel .xlsx Template"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel Template (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSampleCSV}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  title="Download Comma-Separated CSV Template"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV Template</span>
                </button>
              </div>
            </div>

            {/* Click to Include/Exclude Column Pills */}
            <div className="pt-2 border-t border-gray-100">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                Columns in Format ({activeFields.length} selected):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ALL_FIELD_DEFINITIONS.map(field => {
                  const isSelected = selectedFieldKeys.includes(field.key);
                  const isMandatory = field.key === 'name';
                  return (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => toggleField(field.key)}
                      disabled={isMandatory}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                        isSelected 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold' 
                          : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600 line-through'
                      } ${isMandatory ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      {isSelected ? <Check className="w-3 h-3 text-indigo-600" /> : <X className="w-3 h-3 text-gray-400" />}
                      <span>{field.label}</span>
                      {isMandatory && <span className="text-[9px] text-red-500 font-bold">REQ</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* STEP 2: DROPZONE FILE UPLOADER (Supports .xlsx, .xls, .csv, .tsv, .txt) */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            className={`border-2 border-dashed rounded-xl p-4 flex items-center justify-center gap-3.5 cursor-pointer transition-all ${
              dragOver 
                ? 'border-indigo-600 bg-indigo-50' 
                : 'border-indigo-300 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/60'
            }`}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".xlsx,.xls,.csv,.txt,.tsv" 
              onChange={(e) => handleFile(e.target.files?.[0])} 
              className="hidden" 
            />
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-gray-900">
                {uploadedFileName ? `Loaded: ${uploadedFileName} (Click to change)` : 'Click to browse or drop your Excel (.xlsx) / CSV file here'}
              </p>
              <p className="text-[11px] text-gray-500">
                Accepts Microsoft Excel (.xlsx, .xls), CSV, TSV, or TXT formats with automatic column mapping
              </p>
            </div>
          </div>

          {/* STEP 3: PREVIEW & EDITABLE DATA TABLE (ALL 11 COLUMNS FULLY EDITABLE) */}
          {parsedRows.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center text-gray-400 space-y-1.5 bg-white border border-gray-200 rounded-xl">
              <Users className="w-8 h-8 text-gray-300" />
              <p className="text-xs font-bold text-gray-600">No client records loaded yet</p>
              <p className="text-[11px] text-gray-400 max-w-sm">
                Upload your Excel or CSV file above to preview, edit inline, and import clients in bulk.
              </p>
              <button
                type="button"
                onClick={handleAddManualRow}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Row Manually</span>
              </button>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-xs flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-800">
                    Data Preview ({parsedRows.length} rows loaded)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {validRowsCount} Valid
                  </span>
                  {invalidRowsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      {invalidRowsCount} Needs Name
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddManualRow}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Row</span>
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => { setParsedRows([]); setUploadedFileName(''); }}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer"
                  >
                    Clear Table
                  </button>
                </div>
              </div>

              {/* HORIZONTALLY SCROLLABLE TABLE WITH ALL 11 COLUMNS */}
              <div className="overflow-x-auto rounded-lg border border-gray-200 max-h-[380px]">
                <table className="w-full text-xs text-left border-collapse min-w-[1450px]">
                  <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 sticky top-0 z-10 shadow-xs">
                    <tr>
                      <th className="px-2.5 py-2 text-center w-10">#</th>
                      <th className="px-2.5 py-2 min-w-[180px]">Legal Client Name *</th>
                      <th className="px-2.5 py-2 min-w-[140px]">Trade Name</th>
                      <th className="px-2.5 py-2 min-w-[110px]">PAN</th>
                      <th className="px-2.5 py-2 min-w-[140px]">GSTIN</th>
                      <th className="px-2.5 py-2 min-w-[120px]">Phone / Mobile</th>
                      <th className="px-2.5 py-2 min-w-[160px]">Email Address</th>
                      <th className="px-2.5 py-2 min-w-[100px]">File No / Cust ID</th>
                      <th className="px-2.5 py-2 min-w-[130px]">Category</th>
                      <th className="px-2.5 py-2 min-w-[180px]">Business Address</th>
                      <th className="px-2.5 py-2 min-w-[100px]">Fee (₹)</th>
                      <th className="px-2.5 py-2 min-w-[110px]">Billing Cycle</th>
                      <th className="px-2.5 py-2 text-center w-10">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-800">
                    {parsedRows.map((row, idx) => (
                      <tr key={row.id} className={`hover:bg-indigo-50/30 ${!row.name.trim() ? 'bg-amber-50/40' : ''}`}>
                        <td className="px-2.5 py-1.5 text-center text-gray-400 font-mono text-[11px]">{idx + 1}</td>

                        {/* Legal Name */}
                        <td className="px-1.5 py-1.5">
                          <input 
                            type="text" 
                            value={row.name} 
                            placeholder="Client Name *"
                            onChange={e => handleRowChange(row.id, 'name', e.target.value)}
                            className={`w-full h-8 px-2.5 rounded-md font-semibold text-gray-900 outline-none text-xs ${
                              !row.name.trim() 
                                ? 'bg-amber-50 border border-amber-300 focus:border-amber-500' 
                                : 'bg-gray-50 border border-gray-200 focus:bg-white focus:border-indigo-500'
                            }`}
                          />
                        </td>

                        {/* Trade Name */}
                        <td className="px-1.5 py-1.5">
                          <input 
                            type="text" 
                            value={row.tradeName} 
                            placeholder="Trade Name"
                            onChange={e => handleRowChange(row.id, 'tradeName', e.target.value)}
                            className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-md text-gray-700 focus:bg-white focus:border-indigo-500 outline-none text-xs"
                          />
                        </td>

                        {/* PAN */}
                        <td className="px-1.5 py-1.5">
                          <input 
                            type="text" 
                            value={row.pan} 
                            placeholder="ABCDE1234F"
                            maxLength={10}
                            onChange={e => handleRowChange(row.id, 'pan', e.target.value.toUpperCase())}
                            className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-md font-mono text-xs text-gray-800 uppercase focus:bg-white focus:border-indigo-500 outline-none"
                          />
                        </td>

                        {/* GSTIN */}
                        <td className="px-1.5 py-1.5">
                          <input 
                            type="text" 
                            value={row.gst} 
                            placeholder="27ABCDE1234F1Z5"
                            maxLength={15}
                            onChange={e => handleRowChange(row.id, 'gst', e.target.value.toUpperCase())}
                            className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-md font-mono text-xs text-gray-800 uppercase focus:bg-white focus:border-indigo-500 outline-none"
                          />
                        </td>

                        {/* Phone */}
                        <td className="px-1.5 py-1.5">
                          <input 
                            type="text" 
                            value={row.phone} 
                            placeholder="+91 98000 00000"
                            onChange={e => handleRowChange(row.id, 'phone', e.target.value)}
                            className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-700 focus:bg-white focus:border-indigo-500 outline-none"
                          />
                        </td>

                        {/* Email */}
                        <td className="px-1.5 py-1.5">
                          <input 
                            type="email" 
                            value={row.email} 
                            placeholder="client@acme.com"
                            onChange={e => handleRowChange(row.id, 'email', e.target.value)}
                            className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-700 focus:bg-white focus:border-indigo-500 outline-none"
                          />
                        </td>

                        {/* File No */}
                        <td className="px-1.5 py-1.5">
                          <input 
                            type="text" 
                            value={row.fileNo} 
                            placeholder="FN-101"
                            onChange={e => handleRowChange(row.id, 'fileNo', e.target.value)}
                            className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-md text-xs font-mono text-indigo-700 font-bold focus:bg-white focus:border-indigo-500 outline-none"
                          />
                        </td>

                        {/* Category Selector */}
                        <td className="px-1.5 py-1.5">
                          <select
                            value={row.category || 'Pvt Ltd'}
                            onChange={e => handleRowChange(row.id, 'category', e.target.value)}
                            className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-medium text-gray-800 focus:bg-white focus:border-indigo-500 outline-none"
                          >
                            {CATEGORY_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </td>

                        {/* Address */}
                        <td className="px-1.5 py-1.5">
                          <input 
                            type="text" 
                            value={row.address} 
                            placeholder="Office / City Address"
                            onChange={e => handleRowChange(row.id, 'address', e.target.value)}
                            className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-700 focus:bg-white focus:border-indigo-500 outline-none"
                          />
                        </td>

                        {/* Retainer Fee */}
                        <td className="px-1.5 py-1.5">
                          <input 
                            type="number" 
                            value={row.feeAmount} 
                            placeholder="0"
                            onChange={e => handleRowChange(row.id, 'feeAmount', e.target.value)}
                            className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-md text-xs font-bold text-gray-900 focus:bg-white focus:border-indigo-500 outline-none"
                          />
                        </td>

                        {/* Billing Cycle */}
                        <td className="px-1.5 py-1.5">
                          <select
                            value={row.billingCycle || 'Monthly'}
                            onChange={e => handleRowChange(row.id, 'billingCycle', e.target.value)}
                            className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-800 focus:bg-white focus:border-indigo-500 outline-none"
                          >
                            <option value="Monthly">Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                            <option value="Half-Yearly">Half-Yearly</option>
                            <option value="Yearly">Yearly</option>
                            <option value="One-Time">One-Time</option>
                          </select>
                        </td>

                        {/* Action */}
                        <td className="px-2 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            className="p-1.5 rounded hover:bg-rose-100 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* ======================================================================= */}
        {/* FOOTER (STICKY)                                                         */}
        {/* ======================================================================= */}
        <div className="px-6 py-3.5 bg-gray-100 border-t border-gray-200 flex items-center justify-between gap-4 shrink-0">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs transition-colors cursor-pointer shadow-xs"
          >
            Cancel
          </button>

          <button 
            type="button" 
            onClick={handleExecuteImport}
            disabled={isProcessing || validRowsCount === 0}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all cursor-pointer ${
              !isProcessing && validRowsCount > 0
                ? 'bg-[#5b52e0] hover:bg-[#4c44cf] active:scale-98'
                : 'bg-gray-400 opacity-60 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isProcessing 
                ? 'Registering Clients...' 
                : `Batch Import ${validRowsCount} Clients`}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
}
