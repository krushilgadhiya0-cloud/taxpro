import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Calendar, 
  Download, 
  Printer, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  Building2, 
  FolderKanban, 
  Tag, 
  RotateCcw, 
  ChevronDown, 
  X, 
  CheckCheck, 
  CalendarDays, 
  FileSpreadsheet, 
  LayoutList, 
  LayoutGrid, 
  ShieldCheck, 
  ArrowUpDown,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabaseClient';
import { printHtml } from '../../lib/printHelper';
import { formatDate, formatDateTime } from '../../lib/dateUtils';
import { logAuditActivity } from '../../lib/auditLogger';
import TaskHistoryModal from './TaskHistoryModal';

export default function TaskHistoryView({ onShowToast, onNavigate }) {
  // Main Data States
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // User Identity
  const currentUserName = localStorage.getItem('taxpro_user_name') || localStorage.getItem('taxpro_user_fullname') || '';
  const currentUserEmail = localStorage.getItem('taxpro_user_email') || '';

  // Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all'); // 'all' | 'mine'
  const [selectedAssignee, setSelectedAssignee] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedClient, setSelectedClient] = useState('All');
  const [timelinessFilter, setTimelinessFilter] = useState('all'); // 'all' | 'on_time' | 'delayed'
  
  // Date & Period Filtering States
  const [dateFilterMode, setDateFilterMode] = useState('all'); // 'all' | 'today' | '7days' | '30days' | 'month' | 'aug2026' | 'specific_date' | 'specific_month' | 'range'
  const [specificDate, setSpecificDate] = useState('');
  const [specificMonth, setSpecificMonth] = useState('2026-08');
  const [dateRangeFrom, setDateRangeFrom] = useState('');
  const [dateRangeTo, setDateRangeTo] = useState('');

  // View & Sorting States
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [sortBy, setSortBy] = useState('completed_desc'); // 'completed_desc' | 'completed_asc' | 'due_date' | 'title'

  // Modal State
  const [selectedTaskForModal, setSelectedTaskForModal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch all tasks and metadata
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tasksRes, clientsRes, membersRes, projectsRes] = await Promise.all([
        supabase.from('global_tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('id, name, trade_name').order('name', { ascending: true }),
        supabase.from('team_members').select('name').order('name', { ascending: true }),
        supabase.from('projects').select('id, name').order('created_at', { ascending: false })
      ]);

      if (!tasksRes.error && tasksRes.data) {
        setTasks(tasksRes.data);
      } else {
        try {
          const cached = localStorage.getItem('taxpro_tasks');
          if (cached) setTasks(JSON.parse(cached));
        } catch (e) {}
      }

      if (!clientsRes.error && Array.isArray(clientsRes.data)) {
        setClients(clientsRes.data);
      }
      if (!membersRes.error && Array.isArray(membersRes.data)) {
        const names = membersRes.data.map(m => m.name).filter(Boolean);
        setTeamMembers(Array.from(new Set(names)));
      }
      if (!projectsRes.error && Array.isArray(projectsRes.data)) {
        setProjects(projectsRes.data);
      }
    } catch (err) {
      console.error('[TaskHistoryView] Fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleDBUpdate = () => fetchData();
    window.addEventListener('taxpro_db_updated', handleDBUpdate);
    window.addEventListener('ai_task_added', handleDBUpdate);
    return () => {
      window.removeEventListener('taxpro_db_updated', handleDBUpdate);
      window.removeEventListener('ai_task_added', handleDBUpdate);
    };
  }, []);

  // Filter tasks that are Completed
  const completedTasks = useMemo(() => {
    return tasks.filter(t => (t.status || '').toLowerCase() === 'completed');
  }, [tasks]);

  // Helper to test if task belongs to current user
  const isAssignedToMe = (t) => {
    const a = (t.assignee || '').toLowerCase().trim();
    const u = (currentUserName || '').toLowerCase().trim();
    const em = (currentUserEmail || '').toLowerCase().trim();
    return (
      (em && a.includes(em)) ||
      (u && (a === u || (u !== 'administrator' && u !== 'my workspace' && (a.includes(u) || u.includes(a))))) ||
      a === 'me'
    );
  };

  const myCompletedTasks = useMemo(() => {
    return completedTasks.filter(isAssignedToMe);
  }, [completedTasks, currentUserName, currentUserEmail]);

  // Helper to determine if a completed task was on time
  const isTaskOnTime = (t) => {
    if (!t.due_date && !t.dueDate) return true;
    const targetDue = t.due_date || t.dueDate;
    const compDate = (t.completed_at || t.updated_at || '').slice(0, 10);
    if (!compDate) return true;
    return compDate <= targetDue;
  };

  // Helper: compute turnaround duration in readable text
  const getTurnaroundText = (t) => {
    const start = t.created_at ? new Date(t.created_at).getTime() : null;
    const end = t.completed_at 
      ? new Date(t.completed_at).getTime() 
      : (t.updated_at ? new Date(t.updated_at).getTime() : null);

    if (!start || !end || end < start) return 'Same Day';
    const diffHours = Math.round((end - start) / (1000 * 60 * 60));
    if (diffHours < 24) return `${Math.max(1, diffHours)} hours`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'}`;
  };

  // Main Multi-Dimensional Filter Logic
  const filteredTasks = useMemo(() => {
    return completedTasks.filter(t => {
      // 1. Scope Filter
      if (scopeFilter === 'mine' && !isAssignedToMe(t)) {
        return false;
      }

      // 2. Specific Assignee Filter
      if (selectedAssignee !== 'All') {
        const a = (t.assignee || '').toLowerCase().trim();
        if (a !== selectedAssignee.toLowerCase().trim()) return false;
      }

      // 3. Category Filter
      if (selectedCategory !== 'All') {
        if (t.category !== selectedCategory) return false;
      }

      // 4. Client Filter
      if (selectedClient !== 'All') {
        if (t.client !== selectedClient) return false;
      }

      // 5. Timeliness Filter
      if (timelinessFilter === 'on_time' && !isTaskOnTime(t)) return false;
      if (timelinessFilter === 'delayed' && isTaskOnTime(t)) return false;

      // 6. Date & Period Filtering
      const compDateStr = (t.completed_at || t.updated_at || t.due_date || t.dueDate || '').slice(0, 10);
      const compMonthStr = compDateStr.slice(0, 7);
      const compTimestamp = t.completed_at 
        ? new Date(t.completed_at).getTime() 
        : (t.updated_at ? new Date(t.updated_at).getTime() : 0);

      if (dateFilterMode === 'today') {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (compDateStr !== todayStr) return false;
      } else if (dateFilterMode === '7days') {
        if (!compTimestamp || (Date.now() - compTimestamp) > 7 * 24 * 60 * 60 * 1000) return false;
      } else if (dateFilterMode === '30days') {
        if (!compTimestamp || (Date.now() - compTimestamp) > 30 * 24 * 60 * 60 * 1000) return false;
      } else if (dateFilterMode === 'month') {
        const curMonth = new Date().toISOString().slice(0, 7);
        if (compMonthStr !== curMonth) return false;
      } else if (dateFilterMode === 'aug2026') {
        if (compMonthStr !== '2026-08') return false;
      } else if (dateFilterMode === 'specific_date') {
        if (specificDate && compDateStr !== specificDate) return false;
      } else if (dateFilterMode === 'specific_month') {
        if (specificMonth && compMonthStr !== specificMonth) return false;
      } else if (dateFilterMode === 'range') {
        if (dateRangeFrom && compDateStr < dateRangeFrom) return false;
        if (dateRangeTo && compDateStr > dateRangeTo) return false;
      }

      // 7. Search Query Matcher
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchId = (t.id || '').toLowerCase().includes(q);
        const matchClient = (t.client || '').toLowerCase().includes(q);
        const matchProj = (t.project || '').toLowerCase().includes(q);
        const matchAssignee = (t.assignee || '').toLowerCase().includes(q);
        if (!matchTitle && !matchId && !matchClient && !matchProj && !matchAssignee) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'completed_desc') {
        const timeA = new Date(a.completed_at || a.updated_at || 0).getTime();
        const timeB = new Date(b.completed_at || b.updated_at || 0).getTime();
        return timeB - timeA;
      }
      if (sortBy === 'completed_asc') {
        const timeA = new Date(a.completed_at || a.updated_at || 0).getTime();
        const timeB = new Date(b.completed_at || b.updated_at || 0).getTime();
        return timeA - timeB;
      }
      if (sortBy === 'due_date') {
        return (a.due_date || a.dueDate || '').localeCompare(b.due_date || b.dueDate || '');
      }
      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });
  }, [
    completedTasks, 
    scopeFilter, 
    selectedAssignee, 
    selectedCategory, 
    selectedClient, 
    timelinessFilter, 
    dateFilterMode, 
    specificDate, 
    specificMonth, 
    dateRangeFrom, 
    dateRangeTo, 
    searchQuery, 
    sortBy, 
    currentUserName, 
    currentUserEmail
  ]);

  // Analytical Stats computed from current filtered subset
  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const onTime = filteredTasks.filter(isTaskOnTime).length;
    const onTimeRate = total > 0 ? Math.round((onTime / total) * 100) : 100;
    const uniqueClients = new Set(filteredTasks.map(t => t.client).filter(Boolean)).size;
    const uniqueAssignees = new Set(filteredTasks.map(t => t.assignee).filter(Boolean)).size;

    return {
      total,
      onTime,
      onTimeRate,
      uniqueClients,
      uniqueAssignees
    };
  }, [filteredTasks]);

  // Export to Excel / CSV
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredTasks.map(t => ({
        'Task ID': t.id,
        'Title': t.title,
        'Client': t.client || 'General',
        'Project': t.project || 'None',
        'Category': t.category || 'Compliance',
        'Assignee': t.assignee || 'Unassigned',
        'Priority': t.priority || 'Normal',
        'Due Date': t.due_date || t.dueDate || 'N/A',
        'Completed Date': t.completed_at ? formatDate(t.completed_at) : (t.updated_at ? formatDate(t.updated_at) : 'N/A'),
        'Turnaround Time': getTurnaroundText(t),
        'On-Time Status': isTaskOnTime(t) ? 'On-Time' : 'Delayed'
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Historical Deliverables');
      XLSX.writeFile(workbook, `TaxPro_Task_History_${new Date().toISOString().slice(0, 10)}.xlsx`);

      if (onShowToast) onShowToast(`✓ Exported ${filteredTasks.length} historical tasks to Excel!`, 'success');
      logAuditActivity({
        action: 'EXPORT_TASK_HISTORY',
        module: 'Task History',
        details: `Exported ${filteredTasks.length} records to Excel spreadsheet`
      });
    } catch (err) {
      if (onShowToast) onShowToast('Failed to generate Excel export.', 'error');
    }
  };

  // Master Print Function
  const handlePrintRegister = () => {
    const rowsHtml = filteredTasks.map((t, idx) => `
      <tr style="border-bottom: 1px solid #e5e7eb; font-size: 11px;">
        <td style="padding: 8px 10px; font-weight: bold; font-family: monospace;">${t.id || `TSK-${idx+1}`}</td>
        <td style="padding: 8px 10px; font-weight: bold; color: #1e1b4b;">${t.title}</td>
        <td style="padding: 8px 10px; color: #374151;">${t.client || 'Practice General'}</td>
        <td style="padding: 8px 10px; color: #4b5563;">${t.category || 'Compliance'}</td>
        <td style="padding: 8px 10px; color: #1f2937;">${t.assignee || 'Unassigned'}</td>
        <td style="padding: 8px 10px; font-family: monospace;">${t.due_date || t.dueDate || 'N/A'}</td>
        <td style="padding: 8px 10px; font-family: monospace; color: #047857;">${t.completed_at ? formatDate(t.completed_at) : 'Completed'}</td>
        <td style="padding: 8px 10px; font-weight: bold; color: ${isTaskOnTime(t) ? '#059669' : '#dc2626'};">
          ${isTaskOnTime(t) ? '✓ On-Time' : '⚠ Delayed'}
        </td>
      </tr>
    `).join('');

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Roboto, sans-serif; padding: 25px; color: #111827;">
        <div style="display: flex; justify-between; align-items: center; border-bottom: 2px solid #4f46e5; padding-bottom: 15px; margin-bottom: 20px;">
          <div>
            <h1 style="font-size: 20px; font-weight: 800; color: #1e1b4b; margin: 0;">TAXPRO OFFICIAL TASK HISTORY & COMPLIANCE REGISTER</h1>
            <p style="font-size: 11px; color: #6b7280; margin: 4px 0 0 0;">Practice Deliverables Archive • Generated on ${new Date().toLocaleString()}</p>
          </div>
          <div style="text-align: right; font-size: 11px; font-family: monospace;">
            <div>Total Tasks: <strong>${filteredTasks.length}</strong></div>
            <div>On-Time Rate: <strong>${stats.onTimeRate}%</strong></div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background: #f3f4f6; border-bottom: 2px solid #d1d5db; font-size: 10px; text-transform: uppercase; color: #4b5563;">
              <th style="padding: 8px 10px;">ID</th>
              <th style="padding: 8px 10px;">Task Deliverable</th>
              <th style="padding: 8px 10px;">Client</th>
              <th style="padding: 8px 10px;">Category</th>
              <th style="padding: 8px 10px;">Assignee</th>
              <th style="padding: 8px 10px;">Target Due</th>
              <th style="padding: 8px 10px;">Completed Date</th>
              <th style="padding: 8px 10px;">Timeliness</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px dashed #9ca3af; display: flex; justify-content: space-between; font-size: 10px; color: #6b7280;">
          <div>Certified Accurate Deliverables Register • TaxPro Management System</div>
          <div>Authorized Signatory: _________________________</div>
        </div>
      </div>
    `;

    printHtml(htmlContent);
  };

  // Reopen Task Handler
  const handleReopenTask = async (task) => {
    if (!window.confirm(`Are you sure you want to reopen "${task.title}" back to Active Work?`)) return;

    try {
      const { error } = await supabase
        .from('global_tasks')
        .update({
          status: 'In Progress',
          completed_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);

      if (error) throw error;

      logAuditActivity({
        action: 'REOPEN_TASK',
        module: 'Task History',
        details: `Reopened task "${task.title}" (${task.id}) back to In Progress status`
      });

      if (onShowToast) onShowToast(`✓ Task "${task.title}" reopened and returned to Active Work!`, 'success');
      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
      fetchData();
    } catch (err) {
      if (onShowToast) onShowToast('Failed to reopen task.', 'error');
    }
  };

  // Clear all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setScopeFilter('all');
    setSelectedAssignee('All');
    setSelectedCategory('All');
    setSelectedClient('All');
    setTimelinessFilter('all');
    setDateFilterMode('all');
    setSpecificDate('');
    setSpecificMonth('2026-08');
    setDateRangeFrom('');
    setDateRangeTo('');
    setSortBy('completed_desc');
  };

  const hasActiveFilters = searchQuery || scopeFilter !== 'all' || selectedAssignee !== 'All' || 
    selectedCategory !== 'All' || selectedClient !== 'All' || timelinessFilter !== 'all' || 
    dateFilterMode !== 'all';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in text-gray-900 pb-20">
      
      {/* HERO COMMAND BANNER */}
      <div className="bg-gradient-to-r from-[#0d1226] via-[#1a1f3d] to-[#121731] border border-indigo-950/60 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-black uppercase tracking-wider">
              <History className="w-3.5 h-3.5" />
              <span>Completed Tasks & Old History</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-outfit text-white tracking-tight">
              Task History
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Browse and filter all past completed tasks by specific date, month, staff member, client, or category.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-center shrink-0">
            <button
              type="button"
              onClick={fetchData}
              disabled={isSyncing}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
              title="Sync with live database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : 'text-slate-300'}`} />
              <span>{isLoading ? 'Syncing...' : 'Sync'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              title="Download filtered tasks to Excel spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrintRegister}
              className="px-4 py-2 rounded-xl bg-[#5b52e0] hover:bg-[#4c44cf] text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              title="Print official compliance history register"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Register</span>
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Filtered Records</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-outfit text-white">{stats.total}</span>
              <span className="text-[11px] text-slate-400">/ {completedTasks.length} total</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">On-Time Deliveries</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-outfit text-emerald-400">{stats.onTimeRate}%</span>
              <span className="text-[11px] text-emerald-300 font-mono">({stats.onTime} tasks)</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Clients Serviced</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-outfit text-cyan-300">{stats.uniqueClients}</span>
              <span className="text-[11px] text-slate-400">firms</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Team Performers</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-outfit text-indigo-300">{stats.uniqueAssignees}</span>
              <span className="text-[11px] text-slate-400">staff involved</span>
            </div>
          </div>
        </div>
      </div>

      {/* FILTERING COMMAND CENTER */}
      <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs space-y-4">
        
        {/* ROW 1: Search, Scope Switcher, View Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Scope Selector: All Team vs My Tasks */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-gray-100 p-1 rounded-2xl border border-gray-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setScopeFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  scopeFilter === 'all'
                    ? 'bg-[#5b52e0] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>All Firm History ({completedTasks.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('mine')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  scopeFilter === 'mine'
                    ? 'bg-[#5b52e0] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>My History ({myCompletedTasks.length})</span>
              </button>
            </div>

            {/* Quick Reset Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Search Box & View Mode Toggle */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search Title, Task ID, Client, Assignee..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
                title="Table Register View"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
                title="Deliverables Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ROW 2: Date & Period Filter Chips */}
        <div className="pt-2 border-t border-gray-100 flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Period:
            </span>

            {[
              { id: 'all', label: 'All History' },
              { id: 'today', label: 'Today' },
              { id: '7days', label: 'Last 7 Days' },
              { id: '30days', label: 'Last 30 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'aug2026', label: 'Aug 2026 (6)' },
              { id: 'specific_date', label: '📅 Specific Date' },
              { id: 'specific_month', label: '🗓️ Specific Month' },
              { id: 'range', label: '📆 Date Range' }
            ].map(period => (
              <button
                key={period.id}
                type="button"
                onClick={() => setDateFilterMode(period.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  dateFilterMode === period.id 
                    ? 'bg-indigo-950 text-white shadow-xs' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {/* Sub-inputs for Specific Date, Specific Month, and Date Range */}
          {dateFilterMode === 'specific_date' && (
            <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex items-center gap-3 flex-wrap animate-fade-in">
              <span className="text-xs font-bold text-indigo-950">Choose Exact Date:</span>
              <input 
                type="date" 
                value={specificDate}
                onChange={e => setSpecificDate(e.target.value)}
                className="px-3 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold text-gray-900 outline-none focus:border-indigo-600"
              />
              <button
                type="button"
                onClick={() => setSpecificDate('2026-08-24')}
                className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${
                  specificDate === '2026-08-24' ? 'bg-indigo-600 text-white' : 'bg-white border border-indigo-200 text-indigo-900 hover:bg-indigo-50'
                }`}
              >
                Quick: 24 Aug 2026 (Completed Records)
              </button>
              {specificDate && (
                <button
                  type="button"
                  onClick={() => setSpecificDate('')}
                  className="text-xs text-gray-500 hover:text-gray-800"
                >
                  Clear Date
                </button>
              )}
            </div>
          )}

          {dateFilterMode === 'specific_month' && (
            <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex items-center gap-3 flex-wrap animate-fade-in">
              <span className="text-xs font-bold text-indigo-950">Choose Exact Month:</span>
              <input 
                type="month" 
                value={specificMonth}
                onChange={e => setSpecificMonth(e.target.value)}
                className="px-3 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold text-gray-900 outline-none focus:border-indigo-600"
              />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSpecificMonth('2026-08')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${
                    specificMonth === '2026-08' ? 'bg-indigo-600 text-white' : 'bg-white border border-indigo-200 text-indigo-900 hover:bg-indigo-50'
                  }`}
                >
                  Aug 2026 ({completedTasks.filter(t => (t.completed_at || t.updated_at || '').startsWith('2026-08')).length} Tasks)
                </button>
                <button
                  type="button"
                  onClick={() => setSpecificMonth('2026-09')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${
                    specificMonth === '2026-09' ? 'bg-indigo-600 text-white' : 'bg-white border border-indigo-200 text-indigo-900 hover:bg-indigo-50'
                  }`}
                >
                  Sep 2026 (Current)
                </button>
              </div>
              {specificMonth && (
                <button
                  type="button"
                  onClick={() => setSpecificMonth('')}
                  className="text-xs text-gray-500 hover:text-gray-800"
                >
                  Clear Month
                </button>
              )}
            </div>
          )}

          {dateFilterMode === 'range' && (
            <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex items-center gap-3 flex-wrap animate-fade-in">
              <span className="text-xs font-bold text-indigo-950">From:</span>
              <input 
                type="date" 
                value={dateRangeFrom}
                onChange={e => setDateRangeFrom(e.target.value)}
                className="px-3 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold text-gray-900 outline-none focus:border-indigo-600"
              />
              <span className="text-xs font-bold text-indigo-950">To:</span>
              <input 
                type="date" 
                value={dateRangeTo}
                onChange={e => setDateRangeTo(e.target.value)}
                className="px-3 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold text-gray-900 outline-none focus:border-indigo-600"
              />
              {(dateRangeFrom || dateRangeTo) && (
                <button
                  type="button"
                  onClick={() => { setDateRangeFrom(''); setDateRangeTo(''); }}
                  className="text-xs text-gray-500 hover:text-gray-800"
                >
                  Clear Range
                </button>
              )}
            </div>
          )}
        </div>

        {/* ROW 3: Granular Dropdowns (Assignee, Category, Client, Timeliness, Sort) */}
        <div className="pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          
          {/* Assignee Filter */}
          <div>
            <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">
              Assignee / Staff
            </label>
            <select
              value={selectedAssignee}
              onChange={e => setSelectedAssignee(e.target.value)}
              className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:bg-white focus:border-indigo-500"
            >
              <option value="All">All Team Members ({teamMembers.length})</option>
              {teamMembers.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:bg-white focus:border-indigo-500"
            >
              <option value="All">All Categories</option>
              <option value="GST">GST & Compliance</option>
              <option value="Income Tax">Income Tax / ITR</option>
              <option value="MCA / ROC">MCA / ROC Filing</option>
              <option value="Audit">Audit & Assurance</option>
              <option value="Payroll">Payroll & TDS</option>
              <option value="Project Task">Project Tasks</option>
            </select>
          </div>

          {/* Client Filter */}
          <div>
            <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">
              Client
            </label>
            <select
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value)}
              className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:bg-white focus:border-indigo-500 truncate"
            >
              <option value="All">All Clients ({clients.length})</option>
              {clients.map(c => (
                <option key={c.id || c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Timeliness Filter */}
          <div>
            <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">
              Timeliness
            </label>
            <select
              value={timelinessFilter}
              onChange={e => setTimelinessFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:bg-white focus:border-indigo-500"
            >
              <option value="all">All Timeliness</option>
              <option value="on_time">✓ On-Time Deliveries Only</option>
              <option value="delayed">⚠ Delayed Deliveries Only</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-gray-400" />
              Sort Records
            </label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:bg-white focus:border-indigo-500"
            >
              <option value="completed_desc">Completed (Newest First)</option>
              <option value="completed_asc">Completed (Oldest First)</option>
              <option value="due_date">Due Date</option>
              <option value="title">Alphabetical (A - Z)</option>
            </select>
          </div>

        </div>

      </div>

      {/* RESULTS LIST SECTION */}
      {filteredTasks.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 text-[#5b52e0] flex items-center justify-center mx-auto shadow-xs">
            <History className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-extrabold text-gray-900 text-lg font-outfit">No Historical Tasks Match Your Filter</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
              There are {completedTasks.length} total completed deliverables in the archive. Try loosening your filter criteria or click below to view all.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-5 py-2.5 rounded-xl bg-[#5b52e0] hover:bg-[#4c44cf] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Reset All Filters (Show {completedTasks.length} Deliverables)
            </button>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE / REGISTER VIEW */
        <div className="bg-white border border-gray-200 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-wider">
                  <th className="p-4">Task Deliverable</th>
                  <th className="p-4">Client / Project</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Assignee</th>
                  <th className="p-4">Timeliness</th>
                  <th className="p-4">Completed Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTasks.map((task) => {
                  const onTime = isTaskOnTime(task);
                  const turnaround = getTurnaroundText(task);

                  return (
                    <tr 
                      key={task.id} 
                      className="hover:bg-indigo-50/40 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedTaskForModal(task);
                        setIsModalOpen(true);
                      }}
                    >
                      {/* Task ID & Title */}
                      <td className="p-4 max-w-sm">
                        <div className="flex items-start gap-2.5">
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 font-mono font-bold text-[10px] shrink-0 mt-0.5">
                            {task.id}
                          </span>
                          <div>
                            <div className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                              {task.title}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              Turnaround: <span className="font-semibold text-gray-600">{turnaround}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Client / Project */}
                      <td className="p-4">
                        <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          <span className="truncate max-w-[150px]">{task.client || 'General Practice'}</span>
                        </div>
                        {task.project && task.project !== 'None' && (
                          <div className="text-[10px] text-indigo-600 flex items-center gap-1 mt-0.5 font-medium">
                            <FolderKanban className="w-3 h-3" />
                            <span className="truncate max-w-[150px]">{task.project}</span>
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-200 inline-block">
                          {task.category || 'General'}
                        </span>
                      </td>

                      {/* Assignee */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white text-[10px] font-black flex items-center justify-center shadow-2xs shrink-0">
                            {(task.assignee || 'U')[0].toUpperCase()}
                          </div>
                          <span className="font-semibold text-gray-800 truncate max-w-[130px]">
                            {task.assignee || 'Unassigned'}
                          </span>
                        </div>
                      </td>

                      {/* Timeliness & Target Due */}
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            onTime 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{onTime ? 'On-Time' : 'Delayed'}</span>
                          </span>
                          <div className="text-[10px] text-gray-400 font-mono">
                            Due: {task.due_date || task.dueDate || 'N/A'}
                          </div>
                        </div>
                      </td>

                      {/* Completed Date */}
                      <td className="p-4">
                        <div className="font-mono text-gray-900 font-bold">
                          {task.completed_at ? formatDate(task.completed_at) : (task.updated_at ? formatDate(task.updated_at) : 'Completed')}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {task.completed_at ? formatDateTime(task.completed_at).split(',')[1] : ''}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTaskForModal(task);
                              setIsModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1"
                            title="Inspect Task Lifecycle & Audit Log"
                          >
                            <History className="w-3 h-3" />
                            <span>Timeline</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReopenTask(task)}
                            className="p-1 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-all cursor-pointer"
                            title="Reopen Task back to Active Work"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* DELIVERABLES CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => {
            const onTime = isTaskOnTime(task);
            const turnaround = getTurnaroundText(task);

            return (
              <div
                key={task.id}
                onClick={() => {
                  setSelectedTaskForModal(task);
                  setIsModalOpen(true);
                }}
                className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all group cursor-pointer flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 font-mono font-bold text-xs">
                      {task.id}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      onTime 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{onTime ? 'On-Time' : 'Delayed'}</span>
                    </span>
                  </div>

                  <h3 className="font-extrabold text-sm text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {task.title}
                  </h3>

                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="font-medium truncate">{task.client || 'General Practice'}</span>
                    </div>
                    {task.project && task.project !== 'None' && (
                      <div className="flex items-center gap-1.5 text-indigo-600 font-medium truncate">
                        <FolderKanban className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{task.project}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Meta */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white text-[10px] font-black flex items-center justify-center shadow-2xs">
                      {(task.assignee || 'U')[0].toUpperCase()}
                    </div>
                    <span className="font-bold text-gray-800 truncate max-w-[100px]">
                      {task.assignee || 'Unassigned'}
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-gray-400">Completed</div>
                    <div className="font-mono font-bold text-emerald-700 text-xs">
                      {task.completed_at ? formatDate(task.completed_at) : (task.updated_at ? formatDate(task.updated_at) : 'Done')}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL LIFECYCLE & AUDIT LOG MODAL */}
      {isModalOpen && selectedTaskForModal && (
        <TaskHistoryModal
          task={selectedTaskForModal}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTaskForModal(null);
          }}
          onUpdateStatus={async (taskId, newStatus) => {
            await supabase.from('global_tasks').update({ status: newStatus }).eq('id', taskId);
            fetchData();
          }}
          onShowToast={onShowToast}
        />
      )}

    </div>
  );
}
