import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// GET /api/workers (List all workers from PostgreSQL)
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id, 
        name, 
        role, 
        department as dept, 
        salary, 
        attendance, 
        tasks_completed as "tasksCompleted", 
        status, 
        online, 
        avatar, 
        rating,
        email,
        phone
      FROM team_members 
      ORDER BY created_at DESC;
    `);

    res.json({
      success: true,
      count: result.rowCount,
      workers: result.rows
    });
  } catch (err) {
    console.error('[workers GET PG Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/workers/pay (Record salary payout in PostgreSQL)
router.post('/pay', async (req, res) => {
  const { workerId, name, salary } = req.body;
  const numSalary = parseFloat(String(salary || '0').replace(/[^0-9.]/g, '')) || 0;

  try {
    const payId = `PAY-SAL-${Date.now()}`;
    await query(`
      INSERT INTO payments (id, recipient, category, method, amount, status, date)
      VALUES ($1, $2, 'Salary', 'Direct Deposit', $3, 'Success', 'Today')
      ON CONFLICT (id) DO NOTHING;
    `, [payId, `${name} (${workerId})`, numSalary]);

    res.json({
      success: true,
      message: `Salary payout of ${salary} dispatched to ${name} (${workerId}) and saved to PostgreSQL!`,
      paymentId: payId,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[workers pay PG Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
