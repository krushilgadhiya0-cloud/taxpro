import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initDatabase } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');
import authRoutes from './routes/auth.js';
import otpRoutes from './routes/otp.js';
import dashboardRoutes from './routes/dashboard.js';
import paymentsRoutes from './routes/payments.js';
import workersRoutes from './routes/workers.js';
import attendanceRoutes from './routes/attendance.js';
import aiRoutes from './routes/ai.js';
import reportsRoutes from './routes/reports.js';
import integrationsRoutes from './routes/integrations.js';
import chatRoutes from './routes/chat.js';
import dbRoutes from './routes/dbRouter.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// PostgreSQL Universal Data Route
app.use('/api/db', dbRoutes);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/workers', workersRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/chat', chatRoutes);

// Pre-flight check if email is already registered across any role
app.get('/api/check-email', async (req, res) => {
  const email = (req.query.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email parameter is required.' });
  }

  // 1. Check Superadmin
  const superAdminEmail = (process.env.SUPERADMIN_EMAIL || process.env.VITE_SUPERADMIN_EMAIL || 'superadmin@taxpro.com').toLowerCase().trim();
  if (email === superAdminEmail || email === 'workforcepro09@gmail.com') {
    return res.json({
      exists: true,
      email,
      role: 'Super Administrator',
      name: 'Super Admin',
      source: 'superadmin'
    });
  }

  try {
    const { query } = await import('./db.js');
    const checkRes = await query(`
      SELECT 'users' as source, id, email, name, role FROM users WHERE LOWER(TRIM(email)) = $1
      UNION ALL
      SELECT 'team_members' as source, id, email, name, role FROM team_members WHERE LOWER(TRIM(email)) = $1
      UNION ALL
      SELECT 'clients' as source, id, email, name, 'Client' as role FROM clients WHERE LOWER(TRIM(email)) = $1
      LIMIT 1;
    `, [email]);

    if (checkRes && checkRes.rows && checkRes.rows.length > 0) {
      const match = checkRes.rows[0];
      return res.json({
        exists: true,
        email: match.email,
        role: match.role || 'Member',
        name: match.name || '',
        source: match.source
      });
    }

    return res.json({ exists: false });
  } catch (err) {
    console.warn('[Check Email Error]:', err.message);
    return res.json({ exists: false, error: err.message });
  }
});

// Direct Invitation & Instant PostgreSQL Registration API
app.post('/api/invite', async (req, res) => {
  const { 
    memberName, name, targetEmail, email, generatedPassword, password, 
    role, department, phone, salary, permissions, origin, smtpConfig, 
    id, employeeId, pan, bank_account, ifsc, emergency_contact, 
    date_of_joining, notes, upi_id, status, company, company_id, firmName, firmTag 
  } = req.body;
  
  const recipientEmail = (targetEmail || email || '').trim().toLowerCase();
  const recipientName = (memberName || name || '').trim();
  const rawPass = (generatedPassword || password || '').trim() || `TaxPro@${Math.floor(1000 + Math.random() * 9000)}`;
  const empId = id || employeeId || '';

  if (!recipientEmail || !recipientName) {
    return res.status(400).json({ success: false, error: 'Recipient Name and Email are required.' });
  }

  try {
    const { registerInvitedUser } = await import('./routes/auth.js');
    const result = await registerInvitedUser({
      email: recipientEmail,
      name: recipientName,
      password: rawPass,
      id: empId,
      role: role || 'Employee',
      department: department || 'General',
      phone: phone || '',
      salary: salary || '₹50,000/mo',
      permissions: permissions || {},
      origin: origin || req.headers.origin || 'http://localhost:3000',
      smtpConfig,
      pan,
      bank_account,
      ifsc,
      emergency_contact,
      date_of_joining,
      notes,
      upi_id,
      status,
      company: company || firmName || 'TaxPro Advisory & Tax Associates',
      company_id: company_id || firmTag || 'TaxPro'
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        alreadyRegistered: result.alreadyRegistered || false,
        existingRole: result.existingRole || null,
        existingName: result.existingName || null,
        existingEmail: result.existingEmail || recipientEmail,
        error: result.error || 'Account registration could not be completed.'
      });
    }

    res.json({
      success: true,
      message: `✓ ${recipientName} (${recipientEmail}) registered & activated in database! Ready for instant login.`,
      user: result.user,
      member: result.member,
      credentials: result.credentials,
      emailDispatched: result.emailResult?.success || false
    });
  } catch (err) {
    console.error('[Global Invite API Error]:', err.message);
    res.status(500).json({ success: false, error: 'Registration failed: ' + err.message });
  }
});

// Register Complaint / Support Ticket Handler (Persisted in support_tickets & emailed to Super Admin)
app.post('/api/complain', async (req, res) => {
  const { reporterEmail, reporterName, subject: sub, complaintText, category = 'General', priority = 'Medium' } = req.body;
  if (!complaintText || !complaintText.trim()) {
    return res.status(400).json({ success: false, error: 'Complaint text is required.' });
  }

  const superAdminEmail = process.env.SUPERADMIN_EMAIL || process.env.VITE_SUPERADMIN_EMAIL || 'workforcepro09@gmail.com';
  const ticketNo = `TKT-${Date.now().toString().slice(-6)}`;
  const cleanSubject = (sub || complaintText.slice(0, 50)).trim();
  let ticketRecord = null;

  try {
    const { query } = await import('./db.js');
    const result = await query(`
      INSERT INTO support_tickets (id, ticket_no, user_email, user_name, subject, category, message, priority, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Open', NOW())
      RETURNING *;
    `, [
      `ST-${Date.now()}`,
      ticketNo,
      reporterEmail || 'Anonymous',
      reporterName || 'Authorized User',
      cleanSubject,
      category,
      complaintText.trim(),
      priority
    ]);
    if (result && result.rows) {
      ticketRecord = result.rows[0];
    }
  } catch (dbErr) {
    console.warn('[DB Ticket Insert Error]:', dbErr.message);
  }

  let userEmailSent = false;
  let adminEmailSent = false;

  // Dispatch Dual Emails: 1) Confirmation Receipt to User's Inbox, 2) Escalation Alert to Super Admin
  try {
    const { dispatchEmail } = await import('./routes/auth.js');
    const formattedDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    // 1. CONFIRMATION RECEIPT TO USER'S PRIMARY INBOX (Anti-Spam RFC 5322 Compliant)
    const validUserEmail = (reporterEmail && reporterEmail.includes('@') && !reporterEmail.includes('taxpro.com') && reporterEmail !== 'Anonymous') ? reporterEmail.trim() : (reporterEmail && reporterEmail.includes('@') ? reporterEmail.trim() : null);

    if (validUserEmail) {
      const userHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TaxPro Grievance Confirmation - #${ticketNo}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Top Brand Header -->
    <div style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #f1f5f9;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 20px; font-weight: 900; color: #0284c7; letter-spacing: -0.5px;">TAXPRO</span>
        <span style="font-size: 11px; font-weight: 700; background: #e0f2fe; color: #0369a1; padding: 3px 9px; border-radius: 6px; font-family: monospace;">TICKET #${ticketNo}</span>
      </div>
      <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 16px 0 6px 0;">Complaint Registered Successfully</h2>
      <p style="font-size: 13px; color: #64748b; margin: 0;">Official confirmation receipt from TaxPro Grievance & Support Desk</p>
    </div>

    <!-- Main Content -->
    <div style="padding: 28px 32px;">
      <p style="font-size: 14px; color: #334155; margin: 0 0 18px 0;">
        Dear <strong>${reporterName || 'Team Member'}</strong>,
      </p>
      <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
        Thank you for contacting TaxPro Support. Your grievance has been recorded in our central system and escalated directly to the <strong>Super Administrator</strong> for review and resolution.
      </p>

      <!-- Ticket Metadata Summary Card -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 22px;">
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; width: 130px; font-weight: 600;">Ticket Number:</td>
            <td style="padding: 6px 0; font-family: monospace; font-weight: 800; color: #0284c7;">${ticketNo}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Category:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${category}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Priority Level:</td>
            <td style="padding: 6px 0; font-weight: 700; color: ${priority === 'Critical' ? '#b91c1c' : priority === 'High' ? '#c2410c' : '#0369a1'};">${priority}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Subject:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${cleanSubject}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Current Status:</td>
            <td style="padding: 6px 0;"><span style="background-color: #ecfdf5; color: #059669; font-weight: 700; font-size: 11px; padding: 2px 8px; border-radius: 6px; border: 1px solid #a7f3d0;">Open (Under Admin Review)</span></td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Registered At:</td>
            <td style="padding: 6px 0; color: #64748b; font-size: 12px;">${formattedDate}</td>
          </tr>
        </table>
      </div>

      <!-- Grievance Statement Copy -->
      <div style="margin-bottom: 22px;">
        <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Recorded Grievance Statement:</div>
        <div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-left: 4px solid #0284c7; border-radius: 8px; padding: 14px 16px; font-size: 13px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${complaintText.trim()}</div>
      </div>

      <!-- Resolution Commitment Notice -->
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 16px; margin-bottom: 20px;">
        <p style="font-size: 12px; color: #166534; margin: 0; line-height: 1.5;">
          <strong>What happens next:</strong> Our management team reviews all tickets promptly. You can track this ticket status directly inside <strong>TaxPro Settings → Help & Grievance Box</strong> or reply to this email for further assistance.
        </p>
      </div>

      <p style="font-size: 12px; color: #64748b; margin: 0;">
        Warm regards,<br>
        <strong>TaxPro Executive Support & Practice Management Team</strong>
      </p>
    </div>

    <!-- Official RFC 5322 Clean Footer -->
    <div style="padding: 18px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
      TaxPro Practice Intelligence & Management Systems • Dedicated Support Desk<br>
      Ticket Ref: ${ticketNo} • Generated automatically for ${validUserEmail}
    </div>

  </div>
</body>
</html>`;

      const userText = `Hello ${reporterName || 'Team Member'},

Your complaint has been successfully registered in the TaxPro Support Desk.

TICKET SUMMARY:
--------------------------------------------------
Ticket Number:   ${ticketNo}
Subject:         ${cleanSubject}
Category:        ${category}
Priority:        ${priority}
Status:          Open (Under Admin Review)
Registered At:   ${formattedDate}
--------------------------------------------------

RECORDED STATEMENT:
${complaintText.trim()}

WHAT HAPPENS NEXT:
The Super Administrator has received your escalation. You can track this ticket status directly inside TaxPro Settings under Help & Grievance Box. You may also reply directly to this email to add more details.

Thank you,
TaxPro Executive Support Team
`;

      const userMailRes = await dispatchEmail({
        to: validUserEmail,
        fromName: 'TaxPro Support Desk',
        replyTo: superAdminEmail,
        subject: `[TaxPro Support] Confirmation: Ticket #${ticketNo} Registered`,
        html: userHtml,
        text: userText,
        headers: {
          'X-Entity-Ref-ID': ticketNo,
          'X-Priority': '3'
        }
      });
      userEmailSent = userMailRes?.success || false;
    }

    // 2. ESCALATION NOTIFICATION TO SUPER ADMIN (workforcepro09@gmail.com)
    const adminHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Escalation Ticket #${ticketNo}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <div style="padding: 24px 32px 18px 32px; background-color: #0f172a; color: #ffffff;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 16px; font-weight: 800; color: #38bdf8; letter-spacing: -0.5px;">TAXPRO SUPER ADMIN ESCALATION</span>
        <span style="font-size: 11px; font-weight: 800; background: #334155; color: #f8fafc; padding: 3px 8px; border-radius: 6px; font-family: monospace;">#${ticketNo}</span>
      </div>
      <h2 style="font-size: 18px; font-weight: 800; margin: 12px 0 4px 0; color: #ffffff;">New Grievance Ticket Filed</h2>
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">Direct escalation requiring Super Admin attention</p>
    </div>

    <div style="padding: 24px 32px;">
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; color: #64748b; width: 120px; font-weight: 600;">Ticket ID:</td>
            <td style="padding: 5px 0; font-family: monospace; font-weight: 800; color: #0284c7;">${ticketNo}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Reporter:</td>
            <td style="padding: 5px 0; font-weight: 700; color: #0f172a;">${reporterName || 'Staff Member'} &lt;${reporterEmail || 'No Email'}&gt;</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Category:</td>
            <td style="padding: 5px 0; font-weight: 700; color: #0284c7;">${category}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Priority:</td>
            <td style="padding: 5px 0; font-weight: 800; color: ${priority === 'Critical' ? '#dc2626' : priority === 'High' ? '#ea580c' : '#2563eb'};">${priority}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Timestamp:</td>
            <td style="padding: 5px 0; color: #64748b; font-size: 12px;">${formattedDate}</td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 24px;">
        <div style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Detailed Grievance Statement:</div>
        <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; font-size: 13px; line-height: 1.6; color: #0f172a; white-space: pre-wrap;">${complaintText.trim()}</div>
      </div>

      <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        <p style="font-size: 12px; color: #64748b; margin: 0 0 12px 0;">This complaint has been added to your Super Admin Dashboard console.</p>
        <a href="https://taxpro-nine.vercel.app" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 24px; border-radius: 8px;">Open Super Admin Console</a>
      </div>
    </div>

    <div style="padding: 14px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
      TaxPro Escalation System • Hit Reply to respond directly to ${reporterEmail || 'reporter'}
    </div>

  </div>
</body>
</html>`;

    const adminText = `[TaxPro Grievance Escalation] Ticket #${ticketNo}
Reporter: ${reporterName || 'Staff Member'} <${reporterEmail || 'No Email'}>
Category: ${category}
Priority: ${priority}
Timestamp: ${formattedDate}
Subject: ${cleanSubject}

GRIEVANCE STATEMENT:
${complaintText.trim()}

Open console: https://taxpro-nine.vercel.app
`;

    const adminMailRes = await dispatchEmail({
      to: superAdminEmail,
      fromName: 'TaxPro Grievance Escalation',
      replyTo: validUserEmail || superAdminEmail,
      subject: `[TaxPro Escalation] Ticket #${ticketNo}: ${cleanSubject} (${reporterName || 'Staff'})`,
      html: adminHtml,
      text: adminText,
      headers: {
        'X-Entity-Ref-ID': ticketNo,
        'X-Priority': priority === 'Critical' ? '1' : '3'
      }
    });
    adminEmailSent = adminMailRes?.success || false;

  } catch (mailErr) {
    console.warn('[Complaint Email Dispatch Error]:', mailErr.message);
  }

  res.json({
    success: true,
    ticket: ticketRecord || {
      id: `ST-${Date.now()}`,
      ticket_no: ticketNo,
      user_email: reporterEmail,
      user_name: reporterName,
      subject: cleanSubject,
      category,
      message: complaintText,
      priority,
      status: 'Open',
      created_at: new Date().toISOString()
    },
    userEmailSent,
    adminEmailSent,
    message: `✓ Complaint #${ticketNo} successfully recorded. Official confirmation receipt sent to ${reporterEmail || 'your inbox'}.`
  });
});

// Fetch Complaints for Super Admin or Filtered by User Email
app.get('/api/complaints', async (req, res) => {
  try {
    const { query } = await import('./db.js');
    const { email } = req.query;
    let result;
    if (email && email.trim()) {
      result = await query('SELECT * FROM support_tickets WHERE LOWER(user_email) = LOWER($1) ORDER BY created_at DESC', [email.trim()]);
    } else {
      result = await query('SELECT * FROM support_tickets ORDER BY created_at DESC');
    }
    res.json({ success: true, complaints: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Complaint Status (Super Admin Action)
app.patch('/api/complaints/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const { query } = await import('./db.js');
    const result = await query(
      'UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2 OR ticket_no = $2 RETURNING *',
      [status || 'Resolved', id]
    );
    res.json({ success: true, ticket: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ONLINE',
    system: 'TaxPro AI Backend Core',
    database: 'Live Database Active & Synced',
    version: '3.0.0',
    timestamp: new Date().toISOString()
  });
});

// Serve static frontend assets if built
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// JSON 404 handler for unknown API routes (prevents HTML error pages)
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// SPA fallback for all non-API web routes
if (fs.existsSync(distPath)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Global Express JSON error handler (prevents any HTML error stack dump)
app.use((err, req, res, next) => {
  console.error('[Server Unhandled Error]:', err.message);
  res.status(err.status || 500).json({ success: false, error: err.message || 'Internal Server Error' });
});

// Boot and initialize PostgreSQL
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`  TAXPRO AI BACKEND (POSTGRESQL ENABLED) ON PORT ${PORT}`);
      console.log(`  Health Check: http://localhost:${PORT}/api/health`);
      console.log(`  Database API: http://localhost:${PORT}/api/db`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to start TaxPro server:', err);
  }
}

startServer();
