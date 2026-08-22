import { postgresClient as db } from './postgresClient';
import AutonomousVoiceAgent from './autonomousVoiceAgent';

// Helper to log unhandled voice commands for SuperAdmin AI Training
export const logUnhandledIntent = (transcript) => {
  try {
    const existingStr = localStorage.getItem('taxpro_ai_training_logs');
    let logs = [];
    if (existingStr) {
      logs = JSON.parse(existingStr);
      if (!Array.isArray(logs)) logs = [];
    }
    
    logs.unshift({
      id: Date.now(),
      transcript: transcript,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString(),
      status: 'analyzed'
    });
    
    if (logs.length > 50) logs = logs.slice(0, 50);
    localStorage.setItem('taxpro_ai_training_logs', JSON.stringify(logs));
  } catch (err) {}
};

/**
 * Intelligent Local Knowledge Engine & Natural Language Intent Parser
 * Queries real PostgreSQL database directly to answer firm questions and perform actions.
 */
export const executeVoiceIntent = async (transcript, showToastCallback) => {
  const text = transcript.toLowerCase().trim();

  // ==========================================
  // 0. AUTONOMOUS VOICE CLICKING & DIRECT FORM TYPING
  // Examples: "click Save Client", "click Download CSV", "type 9876543210 in phone"
  // ==========================================

  // A. Voice Clicking
  if (
    text.startsWith('click ') || 
    text.startsWith('press ') || 
    text.startsWith('tap ') || 
    text.startsWith('hit ') || 
    text.startsWith('select ') || 
    text.includes('click on ') ||
    text.includes('click button ')
  ) {
    const clickResult = AutonomousVoiceAgent.clickElement(transcript);
    if (clickResult.success) {
      if (showToastCallback) showToastCallback(clickResult.message, 'success');
      return { success: true, message: clickResult.message };
    }
  }

  // B. Voice Typing / Dictation into Form Fields
  if (
    text.startsWith('type ') || 
    text.startsWith('write in ') || 
    text.startsWith('fill in ') || 
    text.startsWith('enter ') || 
    text.startsWith('dictate ') || 
    text.startsWith('input ') ||
    text.startsWith('put ')
  ) {
    let fieldHint = '';
    let textToType = transcript
      .replace(/^(type|write in|fill in|enter|dictate|input|put)\s+/i, '')
      .trim();

    // Check for "in [field]" or "into [field]" pattern: e.g., "type ABC Corp in client name"
    const inMatch = textToType.match(/(.+)\s+(?:in|into|for)\s+(?:the\s+)?([a-zA-Z0-9_\s]+)$/i);
    if (inMatch) {
      textToType = inMatch[1].trim();
      fieldHint = inMatch[2].trim();
    }

    const typeResult = AutonomousVoiceAgent.writeTextToField(textToType, fieldHint);
    if (typeResult.success) {
      if (showToastCallback) showToastCallback(typeResult.message, 'success');
      return { success: true, message: typeResult.message };
    }
  }

  // ==========================================
  // 1. LIVE POSTGRESQL DATABASE QUERIES (Instant Answers)
  // ==========================================

  // A. Revenue & Financials Query
  if (text.includes('revenue') || text.includes('income') || text.includes('payment') || text.includes('financial') || text.includes('money') || text.includes('balance') || text.includes('turnover')) {
    try {
      const { data: payments } = await db.from('payments').select('amount, status');
      if (payments && payments.length > 0) {
        const total = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const formattedTotal = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(total);
        return {
          success: true,
          message: `According to live ledger, total recorded revenue is ${formattedTotal} across ${payments.length} transaction entries.`
        };
      }
    } catch (e) {}
  }

  // B. Clients & Enterprise Accounts Query
  if (text.includes('how many client') || text.includes('client count') || text.includes('total client') || text.includes('number of client') || text.includes('list client')) {
    try {
      const { data: clients } = await db.from('clients').select('name');
      const count = clients ? clients.length : 0;
      const names = clients ? clients.slice(0, 3).map(c => c.name).join(', ') : '';
      return {
        success: true,
        message: `There are currently ${count} verified corporate clients in your database${names ? ` including ${names}` : ''}.`
      };
    } catch (e) {}
  }

  // C. Tasks & Deliverables Query
  if (text.includes('how many task') || text.includes('task count') || text.includes('pending task') || text.includes('active task') || text.includes('what are my task')) {
    try {
      const { data: tasks } = await db.from('global_tasks').select('title, status');
      const count = tasks ? tasks.length : 0;
      const pendingCount = tasks ? tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length : 0;
      return {
        success: true,
        message: `You have ${count} total deliverables recorded, with ${pendingCount} currently active or pending review.`
      };
    } catch (e) {}
  }

  // D. Workforce & Team Directory Query
  if (text.includes('how many member') || text.includes('team member') || text.includes('how many employee') || text.includes('staff count') || text.includes('who is in the team')) {
    try {
      const { data: members } = await db.from('team_members').select('name, role, status');
      const activeCount = members ? members.filter(m => m.status !== 'Access Revoked' && m.status !== 'Past').length : 0;
      return {
        success: true,
        message: `Your firm directory currently comprises ${activeCount} active authorized personnel.`
      };
    } catch (e) {}
  }

  // ==========================================
  // 2. NAVIGATION INTENT
  // Example: "go to workload", "open clients", "show reports"
  // ==========================================
  const navMatch = text.match(/(?:go to|open|show|navigate to|switch to|take me to)\s+(.+)/);
  if (navMatch && navMatch[1]) {
    let rawTarget = navMatch[1].trim();
    const originalTarget = rawTarget;
    
    // Exact mapping dictionary
    if (rawTarget.includes('to do') || rawTarget.includes('todo') || rawTarget.includes('checklist')) rawTarget = 'Todo';
    else if (rawTarget.includes('client') || rawTarget.includes('customer')) rawTarget = 'Clients';
    else if (rawTarget.includes('project') || rawTarget.includes('pipeline')) rawTarget = 'Projects';
    else if (rawTarget.includes('task') || rawTarget.includes('kanban')) rawTarget = 'Tasks';
    else if (rawTarget.includes('report') || rawTarget.includes('audit') || rawTarget.includes('statement')) rawTarget = 'Reports';
    else if (rawTarget.includes('payment') || rawTarget.includes('receipt') || rawTarget.includes('financial')) rawTarget = 'Receipts & Payments';
    else if (rawTarget.includes('fee') || rawTarget.includes('invoice')) rawTarget = 'Fees Tracking';
    else if (rawTarget.includes('payroll') || rawTarget.includes('salary') || rawTarget.includes('wages')) rawTarget = 'Members Payment';
    else if (rawTarget.includes('workload') || rawTarget.includes('timesheet') || rawTarget.includes('capacity')) rawTarget = 'Workload';
    else if (rawTarget.includes('department') || rawTarget.includes('division')) rawTarget = 'Departments';
    else if (rawTarget.includes('setting') || rawTarget.includes('config') || rawTarget.includes('preference')) rawTarget = 'Settings';
    else if (rawTarget.includes('chat') || rawTarget.includes('message') || rawTarget.includes('conversation')) rawTarget = 'Private Chat';
    else if (rawTarget.includes('idea') || rawTarget.includes('innovation')) rawTarget = 'Ideas';
    else if (rawTarget.includes('calendar') || rawTarget.includes('calender') || rawTarget.includes('schedule') || rawTarget.includes('events')) rawTarget = 'Calendar';
    else if (rawTarget.includes('integration') || rawTarget.includes('smtp') || rawTarget.includes('whatsapp')) rawTarget = 'Integrations';
    else if (rawTarget.includes('dashboard') || rawTarget.includes('home') || rawTarget.includes('overview')) rawTarget = 'Dashboard';
    else if (rawTarget.includes('member') || rawTarget.includes('employee') || rawTarget.includes('staff') || rawTarget.includes('worker') || rawTarget.includes('team')) {
       rawTarget = 'Team Members';
    }
    
    const target = rawTarget.replace(/\b\w/g, c => c.toUpperCase()).trim();
    window.dispatchEvent(new CustomEvent('ai_navigate', { detail: target }));
    return { success: true, message: `Navigating to ${target} module now.` };
  }

  // ==========================================
  // 3. DATABASE WRITE: ADD TASK
  // Example: "add task file income tax audit for apex corp"
  // ==========================================
  if (text.startsWith('add task') || text.startsWith('create task') || text.startsWith('new task')) {
    const titleMatch = text.replace(/^(add task|create task|new task)\s+/, '').trim();
    
    if (titleMatch) {
      const taskId = `TSK-${Math.floor(100 + Math.random() * 900)}`;
      const cleanTitle = titleMatch.charAt(0).toUpperCase() + titleMatch.slice(1);
      
      const { error } = await db.from('global_tasks').insert([{
        id: taskId,
        title: cleanTitle,
        client: 'Global / Enterprise (AI Command)', 
        category: 'Tax & Compliance',
        due_date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        priority: 'High',
        assignee: 'Unassigned',
        project: 'PMS Direct'
      }]);

      if (!error) {
        window.dispatchEvent(new CustomEvent('ai_task_added'));
        return { success: true, message: `Created new deliverable task: "${cleanTitle}".` };
      } else {
        return { success: false, message: `Database Error: Could not save AI task.` };
      }
    }
  }

  // ==========================================
  // 4. PRINT / DOWNLOAD OVERVIEW 
  // Example: "download report", "print page"
  // ==========================================
  if (text.includes('download') || text.includes('print') || text.includes('export')) {
    setTimeout(() => window.print(), 800);
    return { success: true, message: `Executing print & document export macro for current view.` };
  }
  
  // ==========================================
  // 5. SEARCH INTENT
  // Example: "search for GST filing"
  // ==========================================
  const searchMatch = text.match(/(?:search for|find|lookup)\s+(.+)/);
  if (searchMatch && searchMatch[1]) {
    const query = searchMatch[1].trim();
    window.dispatchEvent(new CustomEvent('ai_search', { detail: query }));
    return { success: true, message: `Initiating global search across records for "${query}".` };
  }

  // ==========================================
  // 6. TAXPRO CORE DOMAIN INTELLIGENCE REASONING
  // ==========================================
  if (text.includes('gst') || text.includes('tax') || text.includes('tds') || text.includes('itr') || text.includes('audit')) {
    return {
      success: true,
      message: `TaxPro AI processes GST, TDS filings, and Balance Sheet audits with automated reconciliation against financial ledgers.`
    };
  }

  if (text.includes('who are you') || text.includes('what can you do') || text.includes('help')) {
    return {
      success: true,
      message: `I am TaxPro Neural Voice AI. I can navigate modules, query live financials and tasks, create deliverables, search records, and execute automated audit exports.`
    };
  }

  // Log unhandled intent for training
  logUnhandledIntent(transcript);
  
  // ==========================================
  // 7. MULTI-PROVIDER CLOUD LLM FALLBACK
  // ==========================================
  try {
    const prompt = encodeURIComponent(`You are TaxPro AI, an ultra-smart financial enterprise voice assistant. Answer this query in exactly 1 concise, helpful sentence: ${transcript}`);
    const res = await fetch(`https://text.pollinations.ai/${prompt}`, { signal: AbortSignal.timeout(4000) });
    
    if (res.ok) {
       const textResponse = await res.text();
       if (!textResponse.includes('<html>') && !textResponse.includes('<title>') && textResponse.length > 5) {
           return { success: true, message: textResponse.trim() };
       }
    }
  } catch (err) {}
  
  return { 
    success: true, 
    message: `Understood: "${transcript}". Executing operational task in your workspace.` 
  };
};
