import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// List of allowed tables to prevent SQL injection
const ALLOWED_TABLES = new Set([
  'users',
  'team_members',
  'departments',
  'clients',
  'global_tasks',
  'projects',
  'todos',
  'ideas',
  'attendance',
  'reports',
  'payments',
  'receipts_payments',
  'fees',
  'fees_invoices',
  'private_messages',
  'broadcast_messages',
  'ai_action_logs',
  'integrations',
  'app_storage',
  'app_settings',
  'activities',
  'notifications',
  'daily_revenue',
  'leaves',
  'companies'
]);

const validateTable = (req, res, next) => {
  const table = req.params.table;
  if (!ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ success: false, error: `Invalid or unapproved table: ${table}` });
  }
  next();
};

// ==========================================
// 1. GENERIC GET /api/db/:table
// ==========================================
router.get('/:table', validateTable, async (req, res) => {
  const { table } = req.params;
  const { select = '*', order, limit, offset, single, ...filters } = req.query;

  try {
    const whereClauses = [];
    const values = [];
    let paramIndex = 1;

    // Parse filters
    for (const [key, rawVal] of Object.entries(filters)) {
      if (['select', 'order', 'limit', '_limit', 'offset', 'single', '_'].includes(key)) continue;

      const valStr = String(rawVal);

      if (valStr.startsWith('eq.')) {
        whereClauses.push(`"${key}" = $${paramIndex++}`);
        values.push(valStr.slice(3));
      } else if (valStr.startsWith('neq.')) {
        whereClauses.push(`"${key}" != $${paramIndex++}`);
        values.push(valStr.slice(4));
      } else if (valStr.startsWith('ilike.')) {
        whereClauses.push(`"${key}" ILIKE $${paramIndex++}`);
        values.push(valStr.slice(6));
      } else if (valStr.startsWith('like.')) {
        whereClauses.push(`"${key}" LIKE $${paramIndex++}`);
        values.push(valStr.slice(5));
      } else if (valStr.startsWith('in.(') && valStr.endsWith(')')) {
        const items = valStr.slice(4, -1).split(',').map(s => s.trim());
        whereClauses.push(`"${key}" = ANY($${paramIndex++})`);
        values.push(items);
      } else {
        whereClauses.push(`"${key}" = $${paramIndex++}`);
        values.push(rawVal);
      }
    }

    let sql = `SELECT ${select === '*' ? '*' : select} FROM "${table}"`;

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Order By
    if (order) {
      const parts = order.split(',');
      const orderClauses = parts.map(p => {
        const [col, dir = 'asc'] = p.split('.');
        return `"${col.trim()}" ${dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
      });
      sql += ` ORDER BY ${orderClauses.join(', ')}`;
    } else {
      // Default ordering if created_at exists
      sql += ` ORDER BY created_at DESC NULLS LAST`;
    }

    if (limit) {
      sql += ` LIMIT ${parseInt(limit, 10)}`;
    }
    if (offset) {
      sql += ` OFFSET ${parseInt(offset, 10)}`;
    }

    const result = await query(sql, values);

    if (single === 'true') {
      const row = result.rows[0] || null;
      return res.json({ success: true, data: row });
    }

    res.json({
      success: true,
      count: result.rowCount,
      data: result.rows
    });
  } catch (err) {
    console.error(`[dbRouter GET /${table}] Error:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 2. GENERIC POST /api/db/:table (Insert)
// ==========================================
router.post('/:table', validateTable, async (req, res) => {
  const { table } = req.params;
  const payload = req.body;

  if (!payload || (Array.isArray(payload) && payload.length === 0)) {
    return res.status(400).json({ success: false, error: 'Empty insert payload provided.' });
  }

  const items = Array.isArray(payload) ? payload : [payload];

  try {
    const insertedRows = [];

    for (const item of items) {
      const cleanItem = { ...item };

      // Generate ID if missing for tables that require string IDs
      if (!cleanItem.id && !['departments', 'team_members'].includes(table)) {
        const prefix = table.slice(0, 3).toUpperCase();
        cleanItem.id = `${prefix}-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      }

      // Convert objects/arrays to JSON string for jsonb columns if needed
      const keys = Object.keys(cleanItem);
      const values = keys.map(k => {
        const v = cleanItem[k];
        if (v !== null && typeof v === 'object') {
          return JSON.stringify(v);
        }
        return v;
      });

      const cols = keys.map(k => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

      const sql = `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) RETURNING *;`;
      const result = await query(sql, values);
      insertedRows.push(result.rows[0]);
    }

    res.json({
      success: true,
      count: insertedRows.length,
      data: Array.isArray(payload) ? insertedRows : insertedRows[0]
    });
  } catch (err) {
    console.error(`[dbRouter POST /${table}] Error:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 3. GENERIC PATCH / PUT /api/db/:table and /api/db/:table/:id (Update)
// ==========================================
const handleUpdate = async (req, res) => {
  const { table, id } = req.params;
  const updates = req.body;
  const filters = { ...req.query };

  if (id) {
    filters.id = id;
  }

  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, error: 'No update data provided.' });
  }

  try {
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [k, v] of Object.entries(updates)) {
      setClauses.push(`"${k}" = $${paramIndex++}`);
      values.push(v !== null && typeof v === 'object' ? JSON.stringify(v) : v);
    }

    const whereClauses = [];
    for (const [k, rawVal] of Object.entries(filters)) {
      if (rawVal === undefined || rawVal === null) continue;
      const valStr = String(rawVal);
      if (valStr.startsWith('eq.')) {
        whereClauses.push(`"${k}" = $${paramIndex++}`);
        values.push(valStr.slice(3));
      } else if (valStr.startsWith('ilike.')) {
        whereClauses.push(`"${k}" ILIKE $${paramIndex++}`);
        values.push(valStr.slice(6));
      } else {
        whereClauses.push(`"${k}" = $${paramIndex++}`);
        values.push(rawVal);
      }
    }

    if (whereClauses.length === 0) {
      return res.status(400).json({ success: false, error: 'Target filter required for update.' });
    }

    const sql = `
      UPDATE "${table}"
      SET ${setClauses.join(', ')}
      WHERE ${whereClauses.join(' AND ')}
      RETURNING *;
    `;

    const result = await query(sql, values);
    res.json({
      success: true,
      count: result.rowCount,
      data: result.rows
    });
  } catch (err) {
    console.error(`[dbRouter PATCH /${table}] Error:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

router.patch('/:table/:id', validateTable, handleUpdate);
router.put('/:table/:id', validateTable, handleUpdate);
router.patch('/:table', validateTable, handleUpdate);
router.put('/:table', validateTable, handleUpdate);

// ==========================================
// 4. GENERIC DELETE /api/db/:table and /api/db/:table/:id
// ==========================================
const handleDelete = async (req, res) => {
  const { table, id } = req.params;
  const filters = { ...req.query };

  if (id) {
    filters.id = id;
  }

  try {
    const whereClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [k, rawVal] of Object.entries(filters)) {
      if (rawVal === undefined || rawVal === null) continue;
      const valStr = String(rawVal);
      if (valStr.startsWith('eq.')) {
        whereClauses.push(`"${k}" = $${paramIndex++}`);
        values.push(valStr.slice(3));
      } else if (valStr.startsWith('ilike.')) {
        whereClauses.push(`"${k}" ILIKE $${paramIndex++}`);
        values.push(valStr.slice(6));
      } else {
        whereClauses.push(`"${k}" = $${paramIndex++}`);
        values.push(rawVal);
      }
    }

    if (whereClauses.length === 0) {
      return res.status(400).json({ success: false, error: 'Target filter required for delete.' });
    }

    const sql = `
      DELETE FROM "${table}"
      WHERE ${whereClauses.join(' AND ')}
      RETURNING *;
    `;

    const result = await query(sql, values);
    res.json({
      success: true,
      deletedCount: result.rowCount,
      data: result.rows
    });
  } catch (err) {
    console.error(`[dbRouter DELETE /${table}] Error:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

router.delete('/:table/:id', validateTable, handleDelete);
router.delete('/:table', validateTable, handleDelete);

// ==========================================
// 5. APP STORAGE KEY-VALUE SYNC (/api/db/storage/:key)
// ==========================================
router.get('/storage/:key', async (req, res) => {
  const { key } = req.params;
  try {
    const result = await query('SELECT data FROM app_storage WHERE key = $1', [key]);
    if (result.rowCount === 0) {
      return res.json({ success: true, exists: false, data: null });
    }
    res.json({ success: true, exists: true, data: result.rows[0].data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/storage/:key', async (req, res) => {
  const { key } = req.params;
  const payload = req.body;
  try {
    const result = await query(`
      INSERT INTO app_storage (key, data, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key) DO UPDATE
      SET data = EXCLUDED.data, updated_at = NOW()
      RETURNING *;
    `, [key, JSON.stringify(payload)]);

    res.json({ success: true, data: result.rows[0].data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
