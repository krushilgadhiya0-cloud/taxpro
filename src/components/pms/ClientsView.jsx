import React, { useState } from 'react';
import { Plus, Search, Users, Mail, Phone, FileText, CheckCircle, X, Download, Trash2, Printer, History, Archive, MapPin } from 'lucide-react';

export default function ClientsView({ onShowToast }) {
  const [activeTab, setActiveTab] = useState('Active');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeClientStat, setActiveClientStat] = useState(null);

  const [clients, setClients] = useState([
    { id: 'CL-501', name: 'Acme Advisory Corp', tradeName: 'Acme Financials', pan: 'ABCDE1234F', fileNo: 'FN-901', email: 'contact@acme.com', phone: '+91 98765 43210', status: 'Active', paymentHistory: [{ date: '2026-06-15', desc: 'Q1 Compliance Audit', amount: '₹45,000' }, { date: '2026-05-10', desc: 'Setup Retainer', amount: '₹5,000' }] },
    { id: 'CL-502', name: 'Sterling Capital Pvt Ltd', tradeName: 'Sterling Global', pan: 'STRLG8890K', fileNo: 'FN-902', email: 'alex@sterling.com', phone: '+91 98123 45678', status: 'Active', paymentHistory: [{ date: '2026-07-02', desc: 'ITR-6 Filing', amount: '₹25,000' }] },
    { id: 'CL-503', name: 'NexGen Tech Solutions', tradeName: 'NexGen Digital', pan: 'NXGNT5543P', fileNo: 'FN-903', email: 'info@nexgen.io', phone: '+91 97654 32109', status: 'Active', paymentHistory: [{ date: '2026-04-18', desc: 'GST Registration', amount: '₹8,500' }] },
    { id: 'CL-504', name: 'Apex Logistics LLC', tradeName: 'Apex Shipping', pan: 'APXLG1122M', fileNo: 'FN-904', email: 'ops@apexlogistics.com', phone: '+91 99000 11223', status: 'Active', paymentHistory: [{ date: '2026-06-30', desc: 'Monthly TDS Review', amount: '₹12,000' }] },
    { id: 'CL-505', name: 'Zeta Alpha Corp', tradeName: 'Zeta Archives', pan: 'ZETA5555L', fileNo: 'FN-888', email: 'zeta@z.com', phone: '+91 99999 99999', status: 'Old Client', paymentHistory: [{ date: '2025-12-10', desc: 'Final Settlement before closure', amount: '₹10,500' }] }
  ]);

  const [newClient, setNewClient] = useState({
    name: '', tradeName: '', pan: '', gst: '', fileNo: '', email: '', phone: ''
  });

  const handleAddClient = (e) => {
    e.preventDefault();
    if (!newClient.name) return;

    const clientObj = {
      id: `CL-${Math.floor(500 + Math.random() * 500)}`,
      name: newClient.name,
      tradeName: newClient.tradeName || newClient.name,
      pan: newClient.pan || 'ABCDE1234F',
      gst: newClient.gst || '27ABCDE1234F1Z5',
      fileNo: newClient.fileNo || `FN-${Math.floor(900 + Math.random() * 100)}`,
      email: newClient.email || 'client@finexo.in',
      phone: newClient.phone || '+91 98000 00000',
      status: 'Active',
      paymentHistory: []
    };

    setClients([clientObj, ...clients]);
    setIsAddModalOpen(false);
    setNewClient({ name: '', tradeName: '', pan: '', gst: '', fileNo: '', email: '', phone: '' });
    onShowToast && onShowToast('Client registered successfully in Finexo PMS!', 'success');
  };

  const deleteClient = (e, id) => {
    e.stopPropagation();
    if(window.confirm('Are you absolutely sure you want to permanently delete this client? This cannot be undone.')) {
      setClients(clients.filter(c => c.id !== id));
      setActiveClientStat(null);
      if(onShowToast) onShowToast('Client profile permanently deleted.', 'info');
    }
  };

  const toggleOldStatus = (e, id) => {
    e.stopPropagation();
    setClients(clients.map(c => {
      if(c.id === id) {
        const nextStatus = c.status === 'Active' ? 'Old Client' : 'Active';
        if(onShowToast) onShowToast(`Client status changed to ${nextStatus}`, 'success');
        
        // update active modal stat simultaneously if we have it open
        if(activeClientStat && activeClientStat.id === id) {
           setActiveClientStat({ ...c, status: nextStatus });
        }
        
        return { ...c, status: nextStatus };
      }
      return c;
    }));
  };

  const triggerPrint = () => {
    if (onShowToast) onShowToast('Generating printable client ledger...', 'info');
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const filteredClients = clients.filter(c => {
    // Perspective
    if (activeTab === 'Active' && c.status !== 'Active') return false;
    if (activeTab === 'Old' && c.status !== 'Old Client') return false;
    
    // Search
    if (searchQuery) {
       const term = searchQuery.toLowerCase();
       return c.name.toLowerCase().includes(term) || 
              c.tradeName.toLowerCase().includes(term) || 
              c.fileNo.toLowerCase().includes(term) || 
              c.pan.toLowerCase().includes(term);
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f3f4f6] min-h-screen text-gray-800 relative printable-area-container">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold font-outfit text-[#1e1e2d]">Client Directory</h1>
          <p className="text-xs text-gray-500 mt-1">Manage firm client profiles, historical records, and file tracking.</p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button 
            onClick={() => onShowToast && onShowToast('Downloading client ledger as CSV...', 'info')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-sm transition-colors"
          >
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">Download CSV</span>
          </button>
          
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5b52e0] hover:bg-[#4c44cf] text-white text-xs font-bold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" /> Add New Client
          </button>
        </div>
      </div>

      {/* Control Bar: Tabs & Search */}
      <div className="bg-white border border-gray-200 rounded-2xl p-2 sm:p-4 mb-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        
        <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('Active')}
            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'Active' ? 'bg-white text-[#5b52e0] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Active Clients
          </button>
          <button 
            onClick={() => setActiveTab('Old')}
            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'Old' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Old Clients
          </button>
        </div>

        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search Name, Trade Name, File No..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:bg-white focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Client List Grid view */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 print-hidden">
        {filteredClients.length === 0 ? (
           <div className="col-span-full py-12 text-center text-gray-400 font-bold bg-white rounded-2xl border border-gray-200 border-dashed">
             No clients found in this category.
           </div>
        ) : (
          filteredClients.map((c) => (
            <div 
              key={c.id} 
              onClick={() => setActiveClientStat(c)}
              className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer relative group flex flex-col h-full"
            >
               
               <div className="flex items-start justify-between gap-4 mb-4">
                 <div>
                   <h3 className="font-outfit font-extrabold text-lg text-gray-900 leading-tight mb-1 group-hover:text-[#5b52e0] transition-colors">{c.name}</h3>
                   <div className="text-xs font-bold text-gray-500">{c.tradeName}</div>
                 </div>
                 <span className={`px-2 py-1 rounded text-[9px] uppercase tracking-widest font-black shrink-0 ${
                   c.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                 }`}>
                   {c.status}
                 </span>
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
                    className="p-1.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-colors border border-rose-100"
                    title="Delete Client"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => toggleOldStatus(e, c.id)}
                    className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded-lg transition-colors border border-amber-100"
                    title={c.status === 'Active' ? 'Mark as Old' : 'Restore to Active'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-gray-200 shadow-2xl relative">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold font-outfit text-gray-900 mb-1">Register Client</h3>
            <p className="text-xs text-gray-500 mb-6">Initialize a new client record in the master directory.</p>
            
            <form onSubmit={handleAddClient} className="flex flex-col gap-4 text-xs font-semibold">
              <div>
                <label className="text-gray-700 block mb-1">Legal Client Name</label>
                <input type="text" placeholder="e.g. Acme Corp Private Limited" autoFocus value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-indigo-500" required />
              </div>

              <div>
                <label className="text-gray-700 block mb-1">Trade Name (Optional)</label>
                <input type="text" placeholder="e.g. Acme Financials" value={newClient.tradeName} onChange={e => setNewClient({...newClient, tradeName: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-indigo-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-700 block mb-1">PAN Number</label>
                  <input type="text" placeholder="ABCDE1234F" value={newClient.pan} onChange={e => setNewClient({...newClient, pan: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-indigo-500 font-mono" />
                </div>
                <div>
                  <label className="text-gray-700 block mb-1">GSTIN</label>
                  <input type="text" placeholder="27ABCDE1234F1Z5" value={newClient.gst} onChange={e => setNewClient({...newClient, gst: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-indigo-500 font-mono" />
                </div>
              </div>

              <div>
                <label className="text-gray-700 block mb-1">Email Address</label>
                <input type="email" placeholder="client@acme.com" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-indigo-500" />
              </div>

              <button type="submit" className="mt-4 py-3 bg-[#1e1e2d] text-white font-black text-sm rounded-xl hover:bg-indigo-600 shadow-lg transition-colors">
                Commit to Secure Directory
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED STATS & PRINT MODAL */}
      {activeClientStat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs print:bg-white print:static print:p-0">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full border border-gray-200 shadow-2xl relative print:border-none print:shadow-none print:max-w-full">
            <button onClick={() => setActiveClientStat(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 print:hidden hidden sm:block">
              <X className="w-5 h-5" />
            </button>
            
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                   <Users className="w-3.5 h-3.5" /> Client Master Account
                </div>
                <h3 className="text-2xl font-extrabold text-[#1e1e2d] font-outfit leading-tight mb-1">
                  {activeClientStat.name}
                </h3>
                <div className="text-sm font-bold text-gray-500 mb-2">T/A: {activeClientStat.tradeName}</div>
                <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                  activeClientStat.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {activeClientStat.status}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2 print:hidden items-start">
                 <button 
                   onClick={triggerPrint}
                   className="px-3 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 flex items-center gap-1.5 transition-colors"
                 >
                   <Printer className="w-4 h-4" /> Print Record
                 </button>
                 <button 
                   onClick={(e) => toggleOldStatus(e, activeClientStat.id)}
                   className="px-3 py-2 bg-amber-50 text-amber-700 font-bold text-xs rounded-xl hover:bg-amber-100 flex items-center gap-1.5 transition-colors"
                 >
                   <Archive className="w-4 h-4" /> {activeClientStat.status === 'Active' ? 'Mark as Old' : 'Make Active'}
                 </button>
                 <button 
                   onClick={(e) => deleteClient(e, activeClientStat.id)}
                   className="px-3 py-2 bg-rose-50 text-rose-600 font-bold text-xs rounded-xl hover:bg-rose-100 flex items-center gap-1.5 transition-colors"
                 >
                   <Trash2 className="w-4 h-4" /> Remove
                 </button>
              </div>
            </div>

            {/* Profile Info Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
               <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl">
                 <div className="text-[9px] font-black text-gray-400 tracking-widest uppercase mb-1">Physical File No</div>
                 <div className="font-mono font-bold text-indigo-700">{activeClientStat.fileNo}</div>
               </div>
               <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl">
                 <div className="text-[9px] font-black text-gray-400 tracking-widest uppercase mb-1">PAN Detail</div>
                 <div className="font-mono font-bold text-gray-900">{activeClientStat.pan}</div>
               </div>
               <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl col-span-2">
                 <div className="text-[9px] font-black text-gray-400 tracking-widest uppercase mb-1">Contact Reference</div>
                 <div className="text-xs font-bold text-gray-800">{activeClientStat.phone}</div>
                 <div className="text-xs font-bold text-gray-600">{activeClientStat.email}</div>
               </div>
            </div>

            {/* Historical Records */}
            <div>
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

            {/* Print specific CSS */}
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                body * { visibility: hidden; }
                .printable-area-container * { visibility: visible; }
                .print-hidden { display: none !important; }
              }
            `}} />
            
          </div>
        </div>
      )}

    </div>
  );
}
