import { supabase } from './supabaseClient';

// Helper to log unhandled/misunderstood voice commands for SuperAdmin AI Training
export const logUnhandledIntent = (transcript) => {
  try {
    const existingStr = localStorage.getItem('taxpro_ai_training_logs');
    let logs = [];
    if (existingStr) {
      logs = JSON.parse(existingStr);
      if (!Array.isArray(logs)) logs = [];
    }
    
    // Unshift to put newest at the top
    logs.unshift({
      id: Date.now(),
      transcript: transcript,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString(),
      status: 'review_required'
    });
    
    // Keep max 50 for storage limit
    if (logs.length > 50) logs = logs.slice(0, 50);
    
    localStorage.setItem('taxpro_ai_training_logs', JSON.stringify(logs));
  } catch (err) {
    console.error("AI Training Log failed", err);
  }
};

/**
 * Parses raw voice transcript and translates to a UI action or Database write.
 * Returns an object: { success: boolean, message: string }
 */
export const executeVoiceIntent = async (transcript, showToastCallback) => {
  const text = transcript.toLowerCase().trim();
  
  // ==========================================
  // 1. NAVIGATION INTENT
  // Example: "go to workload", "open clients"
  // ==========================================
  const navMatch = text.match(/(?:go to|open|show|navigate to)\s+(.+)/);
  if (navMatch && navMatch[1]) {
    let rawTarget = navMatch[1].trim();
    const originalTarget = rawTarget;
    
    // Special cleanups
    if (rawTarget.includes('to do') || rawTarget.includes('todo')) rawTarget = 'Todo';
    if (rawTarget.includes('client')) rawTarget = 'Clients';
    
    // Advanced Directory Mapping with Sub-TAB Deep-Routing
    if (rawTarget.includes('member') || rawTarget.includes('employee') || rawTarget.includes('staff') || rawTarget.includes('director')) {
       rawTarget = 'Team Members';
       
       if (originalTarget.includes('past') || originalTarget.includes('old') || originalTarget.includes('archive')) {
         setTimeout(() => window.dispatchEvent(new CustomEvent('ai_inner_tab', { detail: 'Past' })), 150);
       } else if (originalTarget.includes('invite') || originalTarget.includes('pending') || originalTarget.includes('request')) {
         setTimeout(() => window.dispatchEvent(new CustomEvent('ai_inner_tab', { detail: 'Invitations' })), 150);
       } else {
         setTimeout(() => window.dispatchEvent(new CustomEvent('ai_inner_tab', { detail: 'Members' })), 150);
       }
    }
    
    const target = rawTarget.replace(/\b\w/g, c => c.toUpperCase());
    window.dispatchEvent(new CustomEvent('ai_navigate', { detail: target }));
    return { success: true, message: `Navigating to ${target} view.` };
  }

  // ==========================================
  // 2. DATABASE WRITE: ADD TASK
  // Example: "add task file tax returns for john"
  // ==========================================
  if (text.startsWith('add task') || text.startsWith('create task')) {
    const titleMatch = text.replace(/^(add task|create task)\s+/, '').trim();
    
    if (titleMatch) {
      const taskId = `TSK-${Math.floor(100 + Math.random() * 900)}`;
      const { error } = await supabase.from('global_tasks').insert([{
        id: taskId,
        title: titleMatch.charAt(0).toUpperCase() + titleMatch.slice(1),
        client: 'Global/Unassigned (AI)', 
        category: 'Other',
        due_date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        priority: 'Medium',
        assignee: 'Unassigned',
        project: 'None',
        attachment: null
      }]);

      if (!error) {
        // Trigger a custom event in case TasksView is already open so it reloads
        window.dispatchEvent(new CustomEvent('ai_task_added'));
        return { success: true, message: `Created new task: "${titleMatch}"` };
      } else {
        return { success: false, message: `Database Error: Could not save AI task.` };
      }
    }
  }

  // ==========================================
  // 3. DATABASE WRITE: ADD TEAM MEMBER
  // Example: "add member sarah jenkins"
  // ==========================================
  if (text.startsWith('add member') || text.startsWith('add employee')) {
    const nameMatch = text.replace(/^(add member|add employee)\s+/, '').trim();
    if (nameMatch) {
      const properName = nameMatch.replace(/\b\w/g, c => c.toUpperCase());
      const { error } = await supabase.from('team_members').insert([{
        name: properName,
        role: 'Team Member',
        email: `${nameMatch.replace(/\s+/g, '').toLowerCase()}@firm.com`,
        department: 'General Staff',
        status: 'Active'
      }]);
      
      if (!error) {
        window.dispatchEvent(new CustomEvent('ai_member_added'));
        return { success: true, message: `Onboarded new member: ${properName}` };
      }
    }
  }

  // ==========================================
  // 4. PRINT / DOWNLOAD OVERVIEW 
  // Example: "download report", "print page"
  // ==========================================
  if (text.includes('download') || text.includes('print')) {
    setTimeout(() => window.print(), 800);
    return { success: true, message: `Executing print & download macro for current view.` };
  }
  
  // ==========================================
  // 5. SEARCH INTENT
  // Example: "search for tax invoice"
  // ==========================================
  const searchMatch = text.match(/(?:search for|find)\s+(.+)/);
  if (searchMatch && searchMatch[1]) {
    const query = searchMatch[1].trim();
    window.dispatchEvent(new CustomEvent('ai_search', { detail: query }));
    return { success: true, message: `Searching platform for "${query}"` };
  }

  // ==========================================
  // UNHANDLED INTENT -> CLOUD LLM FALLBACK
  // ==========================================
  // If no internal system command matched, route the query to the Global Neural Network
  logUnhandledIntent(transcript);
  
  try {
    const prompt = encodeURIComponent(`You are TaxPro AI, an elite assistant. Answer this in exactly 1 crisp sentence without pleasantries: ${transcript}`);
    const res = await fetch(`https://text.pollinations.ai/${prompt}`, { signal: AbortSignal.timeout(8000) });
    
    if (res.ok) {
       const textResponse = await res.text();
       if (!textResponse.includes('<html>') && !textResponse.includes('<title>')) {
           return { success: true, message: textResponse };
       }
    }
  } catch (err) {
    // Drop down to generic error if network fails
  }
  
  return { 
    success: false, 
    message: `Sorry, I didn't quite catch that. Could you say it again?` 
  };
};
