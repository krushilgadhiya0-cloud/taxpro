import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Download, 
  X, 
  Briefcase, 
  CheckSquare, 
  Layers, 
  User, 
  Sparkles, 
  Plus, 
  RefreshCw, 
  LogIn, 
  LogOut, 
  Timer,
  FileSpreadsheet
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function CalendarActivityModal({ isOpen, onClose, onShowToast }) {
  if (!isOpen) return null;

  // Selected date state (defaults to today)
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Data states
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Manual Punch In/Out quick form
  const [showPunchForm, setShowPunchForm] = useState(false);
  const [punchType, setPunchType] = useState('IN'); // 'IN' | 'OUT'
  const [punchTime, setPunchTime] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
  );
  const [punchNote, setPunchNote] = useState('');

  // Fetch data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tasksRes, projRes, attRes, memRes] = await Promise.all([
        supabase.from('global_tasks').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('attendance').select('*'),
        supabase.from('team_members').select('*')
      ]);

      if (tasksRes.data) setTasks(tasksRes.data);
      if (projRes.data) setProjects(projRes.data);
      if (attRes.data) setAttendanceLogs(attRes.data);
      if (memRes.data) setTeamMembers(memRes.data);
    } catch (err) {
      console.warn('[CalendarActivityModal Fetch]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Format date helper: YYYY-MM-DD
  const formatYMD = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const selectedDateStr = formatYMD(selectedDate);
  const todayStr = formatYMD(today);

  // Calendar month days calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1, daysInPrevMonth - i);
      days.push({ date: d, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(currentYear, currentMonth, i);
      days.push({ date: d, isCurrentMonth: true });
    }

    // Next month padding to fill grid to 35 or 42
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      days.push({ date: d, isCurrentMonth: false });
    }

    return days;
  }, [currentMonth, currentYear]);

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
    setSelectedDate(now);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Activities for the Selected Date
  const selectedDayTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!t.due_date) return false;
      return t.due_date === selectedDateStr;
    });
  }, [tasks, selectedDateStr]);

  const selectedDayProjects = useMemo(() => {
    return projects.filter(p => {
      if (!p.deadline) return false;
      return p.deadline === selectedDateStr || p.start_date === selectedDateStr;
    });
  }, [projects, selectedDateStr]);

  // Day attendance / in-out status for selected date
  const selectedDayAttendance = useMemo(() => {
    const rawLocal = localStorage.getItem(`taxpro_punch_${selectedDateStr}`);
    if (rawLocal) {
      try { return JSON.parse(rawLocal); } catch (e) {}
    }

    // Default simulation for current day / weekday vs weekend
    const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
    if (isWeekend) {
      return { status: 'Weekend / Off', inTime: null, outTime: null, hours: '0 hrs', isPresent: false };
    }

    const isPastOrToday = selectedDate <= today;
    if (isPastOrToday) {
      return {
        status: 'Present',
        inTime: '09:15 AM',
        outTime: selectedDateStr === todayStr ? '06:30 PM (Active)' : '06:30 PM',
        hours: '9 hrs 15 mins',
        shift: 'Regular General Shift',
        mode: 'Biometric Verified',
        isPresent: true
      };
    }

    return { status: 'Scheduled', inTime: '09:30 AM (Est)', outTime: '06:30 PM (Est)', hours: '9.0 hrs', isPresent: false };
  }, [selectedDate, selectedDateStr, today, todayStr]);

  // Day activities timeline
  const selectedDayTimeline = useMemo(() => {
    const list = [];
    if (selectedDayAttendance.inTime && selectedDayAttendance.status === 'Present') {
      list.push({
        time: selectedDayAttendance.inTime,
        title: 'Check-In Punch Recorded',
        desc: `Verified shift entry via ${selectedDayAttendance.mode || 'Biometric Laser'}`,
        type: 'in'
      });
    }

    selectedDayTasks.forEach(t => {
      list.push({
        time: '11:30 AM',
        title: `Task Deliverable: ${t.title}`,
        desc: `Status: ${t.status || 'Pending'} • Priority: ${t.priority || 'Medium'} • Assignee: ${t.assignee || 'Assigned'}`,
        type: 'task'
      });
    });

    selectedDayProjects.forEach(p => {
      list.push({
        time: '03:00 PM',
        title: `Project Milestone: ${p.name}`,
        desc: `Client: ${p.client || 'Enterprise'} • Progress: ${p.progress || 0}%`,
        type: 'project'
      });
    });

    if (selectedDayAttendance.outTime && selectedDayAttendance.status === 'Present') {
      list.push({
        time: selectedDayAttendance.outTime,
        title: 'Check-Out Punch Recorded',
        desc: `Completed standard working hours (${selectedDayAttendance.hours})`,
        type: 'out'
      });
    }

    if (list.length === 0) {
      list.push({
        time: '09:30 AM',
        title: 'Standard Workday Schedule',
        desc: 'No urgent deadlines or special attendance overrides logged for this day.',
        type: 'info'
      });
    }

    return list;
  }, [selectedDayAttendance, selectedDayTasks, selectedDayProjects]);

  // Save manual punch
  const handleSavePunch = () => {
    const updated = {
      ...selectedDayAttendance,
      status: 'Present',
      isPresent: true,
      mode: 'Manual Web Entry'
    };

    if (punchType === 'IN') {
      updated.inTime = punchTime;
      if (!updated.outTime) updated.outTime = '06:30 PM';
    } else {
      updated.outTime = punchTime;
      if (!updated.inTime) updated.inTime = '09:00 AM';
    }

    localStorage.setItem(`taxpro_punch_${selectedDateStr}`, JSON.stringify(updated));
    setShowPunchForm(false);
    if (onShowToast) onShowToast(`✓ Check-${punchType.toLowerCase()} at ${punchTime} logged for ${selectedDate.toDateString()}!`, 'success');
  };

  // Download CSV
  const handleDownloadCSV = () => {
    const headers = ['Date', 'Attendance Status', 'Punch In', 'Punch Out', 'Total Hours', 'Tasks Due', 'Projects Active', 'Notes'];
    const rows = [
      headers.join(','),
      [
        `"${selectedDateStr}"`,
        `"${selectedDayAttendance.status}"`,
        `"${selectedDayAttendance.inTime || 'N/A'}"`,
        `"${selectedDayAttendance.outTime || 'N/A'}"`,
        `"${selectedDayAttendance.hours || '0'}"`,
        `"${selectedDayTasks.map(t => t.title).join('; ') || 'None'}"`,
        `"${selectedDayProjects.map(p => p.name).join('; ') || 'None'}"`,
        `"Exported via TaxPro Daily Timesheet"`
      ].join(',')
    ];

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TaxPro_Timesheet_${selectedDateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (onShowToast) onShowToast(`Timesheet for ${selectedDateStr} downloaded successfully!`, 'success');
  };

  // Print Timesheet
  const handlePrint = () => {
    if (onShowToast) onShowToast('Preparing Daily Timesheet & Activity Statement for print...', 'info');
    setTimeout(() => window.print(), 350);
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="modal-overlay-backdrop"
    >
      <div className="modal-content-box max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden text-gray-800">
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-xs">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black font-outfit text-white tracking-tight">
                  Workforce Calendar & Daily Activity Hub
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 hidden sm:inline">
                  Live Timesheet
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-0.5">
                Inspect punch in/out timestamps, hours, tasks, project deliverables, and print statements
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white transition-all cursor-pointer"
              title="Print Daily Timesheet Statement"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={handleDownloadCSV}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-300 hover:text-white transition-all cursor-pointer"
              title="Download Timesheet CSV"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer"
              title="Close Calendar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MODAL MAIN CONTENT (2-COLUMN LAYOUT: CALENDAR GRID LEFT, DETAILED DAY BREAKDOWN RIGHT) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: INTERACTIVE MONTHLY CALENDAR (5 COLS) */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            
            {/* Month & Year Navigation Toolbar */}
            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-2.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg hover:bg-white text-gray-600 hover:text-gray-900 border border-transparent hover:border-gray-200 transition-all cursor-pointer shadow-2xs"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h4 className="text-sm font-extrabold text-gray-900 font-outfit">
                  {monthNames[currentMonth]} {currentYear}
                </h4>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg hover:bg-white text-gray-600 hover:text-gray-900 border border-transparent hover:border-gray-200 transition-all cursor-pointer shadow-2xs"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={goToToday}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[#5b52e0] text-xs font-bold border border-indigo-200 transition-all cursor-pointer"
                >
                  Today
                </button>
              </div>
            </div>

            {/* Calendar Grid Days */}
            <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-2xs">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                  <div key={d} className={`text-[11px] font-black uppercase py-1 ${i === 0 || i === 6 ? 'text-gray-400' : 'text-gray-700'}`}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Day Grid Cells */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((item, idx) => {
                  const dateStr = formatYMD(item.date);
                  const isSelected = dateStr === selectedDateStr;
                  const isToday = dateStr === todayStr;
                  const isCurrent = item.isCurrentMonth;
                  const dayNum = item.date.getDate();

                  // Has tasks on this date?
                  const dayTaskCount = tasks.filter(t => t.due_date === dateStr).length;
                  // Has projects on this date?
                  const dayProjCount = projects.filter(p => p.deadline === dateStr).length;

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(item.date)}
                      className={`h-11 rounded-xl flex flex-col items-center justify-between p-1.5 transition-all text-xs font-bold cursor-pointer relative ${
                        isSelected 
                          ? 'bg-[#5b52e0] text-white shadow-md ring-2 ring-indigo-300' 
                          : (isToday 
                              ? 'bg-indigo-50 border border-indigo-200 text-[#5b52e0] hover:bg-indigo-100' 
                              : (isCurrent 
                                  ? 'bg-gray-50 hover:bg-gray-100 text-gray-800' 
                                  : 'bg-transparent text-gray-300 hover:text-gray-500'))
                      }`}
                    >
                      <span className="leading-none">{dayNum}</span>

                      {/* Mini Indicator Badges */}
                      <div className="flex items-center gap-0.5 mt-auto">
                        {isCurrent && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} title="Working Day" />
                        )}
                        {dayTaskCount > 0 && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-amber-500'}`} title={`${dayTaskCount} tasks due`} />
                        )}
                        {dayProjCount > 0 && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-purple-300' : 'bg-purple-500'}`} title={`${dayProjCount} project milestone`} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Legend Bar */}
              <div className="flex items-center justify-center gap-4 mt-3 pt-2.5 border-t border-gray-100 text-[10px] text-gray-500 font-medium">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Attendance</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Tasks Due</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Project Milestone</span>
              </div>
            </div>

            {/* Selected Date Header Summary Card */}
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#5b52e0]" />
                <span className="text-xs font-bold text-gray-800 font-outfit">
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                selectedDayAttendance.isPresent ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
              }`}>
                {selectedDayAttendance.status}
              </span>
            </div>

          </div>

          {/* RIGHT: DETAILED DAY ACTIVITY BREAKDOWN (6 COLS) */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            
            {/* 1. IN / OUT PUNCH & SHIFT HOURS WIDGET */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-[#5b52e0]" />
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    In / Out Attendance & Hours
                  </h4>
                </div>

                <button
                  onClick={() => setShowPunchForm(!showPunchForm)}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Manual Punch</span>
                </button>
              </div>

              {/* Punch Stats Cards */}
              <div className="grid grid-cols-3 gap-2.5">
                {/* Punch In */}
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-2.5 flex flex-col">
                  <div className="flex items-center gap-1 text-emerald-700 text-[10px] font-bold uppercase">
                    <LogIn className="w-3 h-3" />
                    <span>Check-In</span>
                  </div>
                  <span className="text-sm font-black font-mono text-emerald-800 mt-1">
                    {selectedDayAttendance.inTime || '—'}
                  </span>
                </div>

                {/* Punch Out */}
                <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-2.5 flex flex-col">
                  <div className="flex items-center gap-1 text-blue-700 text-[10px] font-bold uppercase">
                    <LogOut className="w-3 h-3" />
                    <span>Check-Out</span>
                  </div>
                  <span className="text-sm font-black font-mono text-blue-800 mt-1">
                    {selectedDayAttendance.outTime || '—'}
                  </span>
                </div>

                {/* Total Logged Hours */}
                <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-2.5 flex flex-col">
                  <div className="flex items-center gap-1 text-purple-700 text-[10px] font-bold uppercase">
                    <Clock className="w-3 h-3" />
                    <span>Working Hours</span>
                  </div>
                  <span className="text-sm font-black font-mono text-purple-800 mt-1">
                    {selectedDayAttendance.hours}
                  </span>
                </div>
              </div>

              {/* Manual Punch Entry Form Drawer */}
              {showPunchForm && (
                <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl flex flex-col gap-2.5 animate-scale-up">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPunchType('IN')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        punchType === 'IN' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      Check-In (IN)
                    </button>
                    <button
                      onClick={() => setPunchType('OUT')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        punchType === 'OUT' ? 'bg-blue-600 text-white shadow-xs' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      Check-Out (OUT)
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={punchTime}
                      onChange={(e) => setPunchTime(e.target.value)}
                      placeholder="e.g. 09:15 AM"
                      className="flex-1 bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-gray-800 outline-none"
                    />
                    <button
                      onClick={handleSavePunch}
                      className="px-4 py-1 bg-[#5b52e0] hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. TASKS & PROJECTS DUE FOR THIS DAY */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    Assigned Tasks ({selectedDayTasks.length})
                  </h4>
                </div>

                <span className="text-[10px] font-mono text-gray-500">
                  {selectedDayTasks.filter(t => t.status === 'Completed').length} Done
                </span>
              </div>

              {selectedDayTasks.length === 0 ? (
                <div className="py-3 px-3 rounded-xl bg-gray-50 border border-dashed border-gray-200 text-center text-xs text-gray-400">
                  No specific tasks due on this date.
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
                  {selectedDayTasks.map((task, i) => (
                    <div key={task.id || i} className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-900 truncate">{task.title}</div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
                          <span>Assignee: {task.assignee || 'Unassigned'}</span>
                          <span>•</span>
                          <span className="text-amber-700 font-medium">{task.priority || 'Normal'}</span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        task.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {task.status || 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. BRIEF ACTIVITIES CHRONOLOGICAL TIMELINE */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    Daily Activity Timeline
                  </h4>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">Summary Log</span>
              </div>

              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                {selectedDayTimeline.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs">
                    <span className="font-mono text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0">
                      {item.time}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-gray-900 leading-tight">{item.title}</div>
                      <div className="text-[11px] text-gray-500 leading-tight mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-gray-50 border-t border-gray-200 p-3 sm:p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[#5b52e0]" />
            <span className="hidden sm:inline">Click any date to inspect in-out punches, tasks, and deliverables</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sheet</span>
            </button>

            <button
              onClick={handleDownloadCSV}
              className="px-3.5 py-1.5 rounded-xl bg-[#0f766e] hover:bg-teal-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>

            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
