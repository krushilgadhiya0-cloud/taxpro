import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// GET /api/attendance (Fetch latest attendance logs)
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT id, employee_id, employee_name, mode, shift, location, biometric_score, status, logged_at, date, created_at
      FROM attendance
      ORDER BY created_at DESC
      LIMIT 50;
    `);

    res.json({
      success: true,
      count: result.rowCount,
      logs: result.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/attendance/scan (Save attendance scan to PostgreSQL)
router.post('/scan', async (req, res) => {
  const { mode, employeeId, employeeName } = req.body;
  const scanMode = mode || 'fingerprint';
  const empId = employeeId || 'EMP-101';
  const empName = employeeName || 'Dr. Sarah Jenkins';
  const logId = `ATT-${Date.now()}`;
  const logTime = new Date().toLocaleTimeString();

  try {
    const result = await query(`
      INSERT INTO attendance (id, employee_id, employee_name, mode, shift, location, biometric_score, anti_spoof_passed, logged_at, status)
      VALUES ($1, $2, $3, $4, 'Morning Shift A', 'HQ Quantum Gate 4', 99.8, TRUE, $5, 'Present')
      RETURNING *;
    `, [logId, empId, empName, scanMode, logTime]);

    res.json({
      success: true,
      mode: scanMode,
      user: {
        name: empName,
        employeeId: empId,
        shift: 'Morning Shift A',
        location: 'HQ Quantum Gate 4',
        loggedAt: logTime
      },
      biometricScore: 99.8,
      antiSpoofPassed: true,
      record: result.rows[0]
    });
  } catch (err) {
    console.error('[attendance scan PG Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
