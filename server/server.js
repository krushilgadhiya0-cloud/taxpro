import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDatabase } from './db.js';
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

// Direct Invitation & Instant PostgreSQL Registration API
app.post('/api/invite', async (req, res) => {
  const { memberName, name, targetEmail, email, generatedPassword, password, role, department, phone, salary, permissions, origin, smtpConfig } = req.body;
  
  const recipientEmail = (targetEmail || email || '').trim().toLowerCase();
  const recipientName = (memberName || name || '').trim();
  const rawPass = (generatedPassword || password || '').trim() || `TaxPro@${Math.floor(1000 + Math.random() * 9000)}`;

  if (!recipientEmail || !recipientName) {
    return res.status(400).json({ success: false, error: 'Recipient Name and Email are required.' });
  }

  try {
    const { registerInvitedUser } = await import('./routes/auth.js');
    const result = await registerInvitedUser({
      email: recipientEmail,
      name: recipientName,
      password: rawPass,
      role: role || 'Employee',
      department: department || 'General',
      phone: phone || '',
      salary: salary || '$10,000/mo',
      permissions: permissions || {},
      origin: origin || req.headers.origin || 'http://localhost:5173',
      smtpConfig
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        alreadyRegistered: result.alreadyRegistered || false,
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

// Register Complaint / Support Ticket Handler (Persisted in support_tickets table)
app.post('/api/complain', async (req, res) => {
  const { reporterEmail, reporterName, complaintText, category = 'General', priority = 'Medium' } = req.body;
  if (!complaintText || !complaintText.trim()) {
    return res.status(400).json({ success: false, error: 'Complaint text is required.' });
  }

  try {
    const { query } = await import('./db.js');
    const ticketNo = `TKT-${Date.now().toString().slice(-6)}`;
    const result = await query(`
      INSERT INTO support_tickets (id, ticket_no, user_email, user_name, subject, category, message, priority, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Open', NOW())
      RETURNING *;
    `, [
      `ST-${Date.now()}`,
      ticketNo,
      reporterEmail || 'Anonymous',
      reporterName || 'Authorized User',
      complaintText.slice(0, 50),
      category,
      complaintText.trim(),
      priority
    ]);

    res.json({ success: true, ticket: result.rows[0] });
  } catch (err) {
    console.error('[Complaint Route Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/complaints', async (req, res) => {
  try {
    const { query } = await import('./db.js');
    const result = await query('SELECT * FROM support_tickets ORDER BY created_at DESC');
    res.json({ success: true, complaints: result.rows });
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

// JSON 404 handler for unknown API routes (prevents HTML error pages)
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: `API route not found: ${req.method} ${req.originalUrl}` });
});

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
