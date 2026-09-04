import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Building2, 
  FolderKanban, 
  Paperclip, 
  Printer, 
  ArrowRight, 
  History, 
  ShieldCheck, 
  RotateCcw,
  CheckCheck,
  Tag,
  FileText,
  Activity
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { printHtml } from '../../lib/printHelper';
import { formatDate, formatDateTime } from '../../lib/dateUtils';

export default function TaskHistoryModal({ 
  task, 
  isOpen, 
  onClose, 
  onUpdateStatus, 
  onShowToast 
}) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Fetch audit logs related to this task
  useEffect(() => {
    if (!isOpen || !task) return;

    let isMounted = true;
    setIsLoadingLogs(true);

    const fetchLogs = async () => {
      try {
        // 1. Fetch DB logs
        const { data: dbLogs } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false });

        // 2. Fetch local storage cached logs
        let localLogs = [];
        try {
          localLogs = JSON.parse(localStorage.getItem('taxpro_audit_logs') || '[]');
        } catch (e) {}

        const combined = [...(dbLogs || []), ...localLogs];

        // Filter logs matching this task ID or task title
        const taskId = String(task.id || '').trim();
        const taskTitle = String(task.title || '').trim().toLowerCase();

        const matched = combined.filter(log => {
          if (!log) return false;
          const metaTaskId = String(log.metadata?.taskId || '').trim();
          if (taskId && metaTaskId === taskId) return true;
          
          const details = String(log.details || '').toLowerCase();
          if (taskId && details.includes(taskId.toLowerCase())) return true;
          if (taskTitle && details.includes(taskTitle)) return true;
          return false;
        });

        // Deduplicate by ID
        const unique = [];
        const seen = new Set();
        for (const item of matched) {
          const key = item.id || `${item.action}-${item.created_at}`;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
          }
        }

        // Sort chronological (newest first)
        unique.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (isMounted) {
          setAuditLogs(unique);
          setIsLoadingLogs(false);
        }
      } catch (err) {
        console.warn('[TaskHistoryModal Log Error]:', err);
        if (isMounted) setIsLoadingLogs(false);
      }
    };

    fetchLogs();

    return () => {
      isMounted = false;
    };
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const isCompleted = task.status === 'Completed';
  const isInProgress = task.status === 'In Progress';
  const isPending = !isCompleted && !isInProgress;
  const isOverdue = task.due_date && task.due_date < new Date().toISOString().slice(0, 10) && !isCompleted;

  // Calculate turnaround duration
  const createdDate = task.created_at ? new Date(task.created_at) : null;
  const completedDate = task.completed_at ? new Date(task.completed_at) : (isCompleted && task.updated_at ? new Date(task.updated_at) : null);
  
  let durationText = 'Active / In Progress';
  if (createdDate && completedDate) {
    const diffMs = Math.max(0, completedDate.getTime() - createdDate.getTime());
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) {
      durationText = `${diffDays} day${diffDays > 1 ? 's' : ''} ${diffHours % 24} hr${diffHours % 24 > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      durationText = `${diffHours} hr${diffHours > 1 ? 's' : ''}`;
    } else {
      const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      durationText = `${diffMins} min${diffMins > 1 ? 's' : ''}`;
    }
  }

  // Completion timeliness
  const wasCompletedOnTime = isCompleted && task.due_date && completedDate 
    ? completedDate.toISOString().slice(0, 10) <= task.due_date
    : null;

  // Print Task Dossier Report
  const handlePrintDossier = () => {
    const auditRows = auditLogs.length > 0 ? auditLogs.map((l, idx) => `
      <tr>
        <td style="font-family: monospace; color: #64748b; text-align: center;">${idx + 1}</td>
        <td><strong>${l.action || 'ACTIVITY'}</strong></td>
        <td>${l.user_name || 'Staff User'} (${l.user_role || 'Employee'})</td>
        <td>${l.details || 'Task state updated'}</td>
        <td style="font-family: monospace; font-size: 10px;">${formatDateTime(l.created_at)}</td>
      </tr>
    `).join('') : `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 12px;">No separate audit entries logged for this task.</td></tr>`;

    const body = `
      <div style="margin-bottom: 20px; border-bottom: 2px solid #6366f1; padding-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h2 style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 800;">TASK COMPLIANCE & HISTORY DOSSIER</h2>
            <div style="color: #6366f1; font-weight: 700; font-size: 12px; margin-top: 4px;">Task ID: ${task.id}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; color: #64748b;">Current Status: <strong style="color: ${isCompleted ? '#059669' : '#d97706'}">${task.status || 'Pending'}</strong></div>
            <div style="font-size: 10px; color: #94a3b8; font-family: monospace;">Generated: ${formatDateTime(new Date())}</div>
          </div>
        </div>
      </div>

      <table style="margin-bottom: 20px;">
        <tbody>
          <tr>
            <td style="width: 25%; font-weight: bold; background: #f8fafc;">Task Title:</td>
            <td style="width: 75%; font-weight: 600;">${task.title}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f8fafc;">Client / Trade Name:</td>
            <td>${task.client || 'Internal Practice'}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f8fafc;">Assigned To:</td>
            <td><strong>${task.assignee || 'Unassigned'}</strong></td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f8fafc;">Category & Priority:</td>
            <td>${task.category || 'General'} • Priority: ${task.priority || 'Medium'}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f8fafc;">Project Association:</td>
            <td>${task.project && task.project !== 'None' ? task.project : 'None (Standalone Deliverable)'}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f8fafc;">Target Due Date:</td>
            <td style="font-family: monospace;">${formatDate(task.due_date || task.dueDate)}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f8fafc;">Created Timestamp:</td>
            <td style="font-family: monospace;">${task.created_at ? formatDateTime(task.created_at) : 'N/A'}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f8fafc;">Completed Timestamp:</td>
            <td style="font-family: monospace;">${task.completed_at ? formatDateTime(task.completed_at) : (isCompleted ? 'Completed' : 'Pending Completion')}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f8fafc;">Total Turnaround Time:</td>
            <td><strong>${durationText}</strong> ${wasCompletedOnTime === true ? '✓ (Delivered On Schedule)' : wasCompletedOnTime === false ? '⚠️ (Delivered Overdue)' : ''}</td>
          </tr>
          ${task.notes ? `
          <tr>
            <td style="font-weight: bold; background: #f8fafc;">Deliverable Notes:</td>
            <td>${task.notes}</td>
          </tr>
          ` : ''}
        </tbody>
      </table>

      <div style="margin-top: 24px; margin-bottom: 8px; font-weight: 800; font-size: 12px; color: #1e293b;">
        Detailed Activity & Modification Logs (${auditLogs.length} Records)
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 35px; text-align: center;">#</th>
            <th>Action</th>
            <th>Actor User</th>
            <th>Details</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          ${auditRows}
        </tbody>
      </table>
    `;

    printHtml(`Task_History_${task.id}`, body);

    if (onShowToast) onShowToast('🖨️ Generating printable task history dossier...', 'info');
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-modal-smooth">
        
        {/* Modal Top Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white z-20 px-6 py-5 border-b border-indigo-900/50 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center shrink-0 shadow-inner">
              <History className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-300 font-mono text-[10px] font-bold">
                  {task.id}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  task.priority === 'Urgent' || task.priority === 'High'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30'
                }`}>
                  {task.priority || 'Medium'} Priority
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-white text-[10px] font-bold">
                  {task.category || 'General Task'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black font-outfit text-white tracking-tight mt-1 line-clamp-1">
                {task.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintDossier}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white transition-colors cursor-pointer"
              title="Print Task History Dossier"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button 
              onClick={onClose} 
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar bg-slate-50/50">
          
          {/* 1. Quick Stats Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            {/* Status Card */}
            <div className="p-3.5 bg-white rounded-2xl border border-gray-200 shadow-2xs">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Current Status</div>
              <div className="mt-1 flex items-center gap-1.5 font-bold text-xs">
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                  isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  isInProgress ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                  isOverdue ? 'bg-rose-50 text-red-700 border border-red-200' :
                  'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                  {isInProgress && <Clock className="w-3 h-3 text-blue-600" />}
                  {isOverdue && <AlertCircle className="w-3 h-3 text-rose-600" />}
                  {task.status || 'Pending'}
                </span>
              </div>
            </div>

            {/* Target Due Date */}
            <div className="p-3.5 bg-white rounded-2xl border border-gray-200 shadow-2xs">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Target Due Date</div>
              <div className={`mt-1 font-mono font-bold text-xs flex items-center gap-1 ${
                isOverdue ? 'text-rose-600' : 'text-gray-800'
              }`}>
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>{formatDate(task.due_date || task.dueDate, 'No Due Date')}</span>
              </div>
            </div>

            {/* Turnaround Time */}
            <div className="p-3.5 bg-white rounded-2xl border border-gray-200 shadow-2xs">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Turnaround Duration</div>
              <div className="mt-1 font-bold text-xs text-indigo-700 flex items-center gap-1 truncate">
                <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="truncate">{durationText}</span>
              </div>
            </div>

            {/* Delivery Timeliness */}
            <div className="p-3.5 bg-white rounded-2xl border border-gray-200 shadow-2xs">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Delivery Timeliness</div>
              <div className="mt-1 font-bold text-xs flex items-center gap-1">
                {isCompleted ? (
                  wasCompletedOnTime ? (
                    <span className="text-emerald-700 inline-flex items-center gap-1 text-[11px]">
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> On-Time
                    </span>
                  ) : (
                    <span className="text-amber-700 inline-flex items-center gap-1 text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Delayed Finish
                    </span>
                  )
                ) : isOverdue ? (
                  <span className="text-rose-700 inline-flex items-center gap-1 text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Currently Overdue
                  </span>
                ) : (
                  <span className="text-blue-700 inline-flex items-center gap-1 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-blue-600" /> On Track
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* 2. Task Details Box */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2 text-gray-600">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">Client:</span>
                <strong className="text-gray-900">{task.client || 'Practice Internal'}</strong>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4 text-indigo-500" />
                <span className="text-gray-400">Assignee:</span>
                <strong className="text-indigo-700">{task.assignee || 'Unassigned'}</strong>
              </div>
            </div>

            {task.project && task.project !== 'None' && (
              <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 p-2 rounded-xl border border-purple-100">
                <FolderKanban className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Linked Project: <strong>{task.project}</strong></span>
              </div>
            )}

            {task.notes && (
              <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-200/70">
                <span className="font-bold text-gray-700 block mb-1">Task Scope & Notes:</span>
                <p className="whitespace-pre-line">{task.notes}</p>
              </div>
            )}

            {task.attachment && (
              <div className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100">
                <Paperclip className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Attached File: <strong>{task.attachment}</strong></span>
              </div>
            )}
          </div>

          {/* 3. VISUAL CHRONOLOGICAL TASK TIMELINE */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-sm font-outfit text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#5b52e0]" />
                <span>Task Progression Timeline</span>
              </h4>
              <span className="text-[10px] font-mono text-gray-400">
                Chronological Life Cycle
              </span>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-100">
              
              {/* Step 1: Created */}
              <div className="relative group">
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] ring-4 ring-white shadow-xs">
                  ✓
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-gray-900">Task Created & Logged</span>
                    <span className="text-[10px] font-mono text-gray-400">
                      {task.created_at ? formatDateTime(task.created_at) : 'Genesis Date'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Assigned to <strong className="text-gray-700">{task.assignee || 'Staff Member'}</strong> with priority <strong className="text-gray-700">{task.priority || 'Medium'}</strong>. Target due date set to <span className="font-mono text-gray-700">{formatDate(task.due_date || task.dueDate)}</span>.
                  </p>
                </div>
              </div>

              {/* Step 2: In Progress / Execution */}
              {(isInProgress || isCompleted) && (
                <div className="relative group">
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] ring-4 ring-white shadow-xs">
                    ⚡
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-blue-900">Execution Commenced</span>
                      <span className="text-[10px] font-mono text-blue-500">
                        {task.updated_at ? formatDateTime(task.updated_at) : 'Work in Progress'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Task moved to active processing by {task.assignee || 'team member'}. Deliverable draft and compliance checks underway.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Completion Milestone */}
              {isCompleted ? (
                <div className="relative group">
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] ring-4 ring-white shadow-xs">
                    ✓
                  </div>
                  <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-emerald-950 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Deliverable Completed & Verified</span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-800 font-bold">
                        {task.completed_at ? formatDateTime(task.completed_at) : (task.updated_at ? formatDateTime(task.updated_at) : 'Finished')}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-900/80 mt-1">
                      Task marked as successfully completed. Total turnaround duration: <strong>{durationText}</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative group">
                  <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ring-4 ring-white shadow-xs ${
                    isOverdue ? 'bg-rose-500 text-white' : 'bg-amber-400 text-slate-900'
                  }`}>
                    ⏳
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`font-black text-xs ${isOverdue ? 'text-rose-700' : 'text-amber-800'}`}>
                        {isOverdue ? 'Overdue Completion Pending' : 'Awaiting Final Completion'}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400">Current Phase</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {isOverdue 
                        ? `This task exceeded its target due date (${formatDate(task.due_date || task.dueDate)}). Please expedite completion.` 
                        : 'Work is currently ongoing. Click "Mark Done" once the compliance deliverable is ready.'}
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* 4. AUDIT ACTIVITY LOGS FOR THIS TASK */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-sm font-outfit text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Tamper-Evident Audit Records ({auditLogs.length})</span>
              </h4>
              <span className="text-[10px] font-mono text-gray-400">
                Security & Verification Trail
              </span>
            </div>

            {isLoadingLogs ? (
              <div className="p-6 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 animate-spin text-[#5b52e0]" />
                <span>Loading compliance records...</span>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-xs italic bg-gray-50 rounded-xl border border-gray-100">
                No external audit trail entries logged yet for this task ID.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto custom-scrollbar">
                {auditLogs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{log.action}</span>
                        <span className="text-[10px] text-gray-400 font-medium">by {log.user_name || 'Staff User'}</span>
                      </div>
                      <p className="text-gray-600 text-[11px] leading-relaxed">{log.details}</p>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 shrink-0">
                      {formatDateTime(log.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {onUpdateStatus && (
              <>
                {isCompleted ? (
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(task.id, 'In Progress')}
                    className="px-3 py-1.5 rounded-xl font-bold text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reopen Task</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(task.id, 'Completed')}
                    className="px-3.5 py-1.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark as Done</span>
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintDossier}
              className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-gray-500" />
              <span>Print Dossier</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
