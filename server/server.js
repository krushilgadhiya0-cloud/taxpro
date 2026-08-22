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

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'Finexo AI Backend Core',
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
