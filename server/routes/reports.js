import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// GET /api/reports (Fetch reports from PostgreSQL)
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT id, title, type, status, date, size, created_at 
      FROM reports 
      ORDER BY created_at DESC;
    `);

    res.json({
      success: true,
      count: result.rowCount,
      reports: result.rows
    });
  } catch (err) {
    console.error('[reports GET PG Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/reports/generate (Save generated report in PostgreSQL)
router.post('/generate', async (req, res) => {
  const { type, title } = req.body;
  const newId = `REP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
  const repTitle = title || `${type || 'Compliance'} Automated AI Audit`;
  const repType = type || 'Tax Filing';

  try {
    const result = await query(`
      INSERT INTO reports (id, title, type, status, date, size)
      VALUES ($1, $2, $3, 'Verified', 'Just Now', '2.8 MB')
      RETURNING *;
    `, [newId, repTitle, repType]);

    res.json({
      success: true,
      message: `Report "${repTitle}" generated and saved to PostgreSQL!`,
      report: result.rows[0]
    });
  } catch (err) {
    console.error('[reports generate PG Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
