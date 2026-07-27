import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import otpRoutes from './routes/otp.js';
import dashboardRoutes from './routes/dashboard.js';
import paymentsRoutes from './routes/payments.js';
import workersRoutes from './routes/workers.js';
import attendanceRoutes from './routes/attendance.js';
import aiRoutes from './routes/ai.js';
import reportsRoutes from './routes/reports.js';
import integrationsRoutes from './routes/integrations.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'Finexo AI Backend Core',
    version: '3.0.0',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  TAXPRO AI BACKEND SERVER RUNNING ON PORT ${PORT}`);
  console.log(`  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});
