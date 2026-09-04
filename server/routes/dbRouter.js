import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// List of allowed tables to prevent SQL injection
const ALLOWED_TABLES = new Set([
  'users',
  'team_members',
  'departments',
  'clients',
  'contact_persons',
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
  'member_payouts',
  'private_messages',
  'broadcast_messages',
  'communication_logs',
  'calendar_events',
  'support_tickets',
  'firm_profile',
  'ai_action_logs',
  'integrations',
  'app_storage',
  'app_settings',
  'activities',
  'notifications',
  'daily_revenue',
  'leaves',
  'companies',
  'audit_logs'
]);

const validateTable = (req, res, next) => {
  const table = req.params.table;
  if (!ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ success: false, error: `Invalid or unapproved table: ${table}` });
  }
  next();
};

const unwrapStorageData = (data) => {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const keys = Object.keys(data);
    if (keys.length === 1 && (keys[0] === 'value' || keys[0] === 'VALUE')) {
      return data[keys[0]];
    }
  }
  return data;
};

// ==========================================
// 1. APP STORAGE KEY-VALUE SYNC (/api/db/storage-all & /api/db/storage/:key)
// (Must precede /:table to prevent route collision)
// ==========================================
router.get('/storage-all', async (req, res) => {
  try {
    const result = await query('SELECT key, data FROM app_storage');
    const map = {};
    for (const row of result.rows) {
      map[row.key] = unwrapStorageData(row.data);
    }
    res.json({ success: true, data: map });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/storage/:key', async (req, res) => {
  const { key } = req.params;
  try {
    const result = await query('SELECT data FROM app_storage WHERE key = $1', [key]);
    if (result.rowCount === 0) {
      return res.json({ success: true, exists: false, data: null });
    }
    res.json({ success: true, exists: true, data: unwrapStorageData(result.rows[0].data) });
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

// ==========================================
// 2. GENERIC GET /api/db/:table
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

const TABLE_COLUMNS_CACHE = new Map();

async function getTableColumns(table) {
  if (TABLE_COLUMNS_CACHE.has(table)) {
    return TABLE_COLUMNS_CACHE.get(table);
  }
  try {
    const res = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1
    `, [table]);
    if (res.rows && res.rows.length > 0) {
      const cols = new Set(res.rows.map(r => r.column_name));
      TABLE_COLUMNS_CACHE.set(table, cols);
      return cols;
    }
    return null;
  } catch (e) {
    return null;
  }
}

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
    const validCols = await getTableColumns(table);

    for (const item of items) {
      const cleanItem = { ...item };

      // Generate ID if missing for tables that require string IDs
      if (!cleanItem.id && !['departments', 'team_members'].includes(table)) {
        const prefix = table.slice(0, 3).toUpperCase();
        cleanItem.id = `${prefix}-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      }

      // Map aliases and sanitize against schema
      if (validCols) {
        if (!cleanItem.due_date && cleanItem.dueDate) cleanItem.due_date = cleanItem.dueDate;
        if (!cleanItem.created_at && cleanItem.createdAt) cleanItem.created_at = cleanItem.createdAt;
        if (!cleanItem.updated_at && cleanItem.updatedAt) cleanItem.updated_at = cleanItem.updatedAt;
        if (!cleanItem.client_id && cleanItem.clientId) cleanItem.client_id = cleanItem.clientId;
        if (!cleanItem.project_id && cleanItem.projectId) cleanItem.project_id = cleanItem.projectId;
        if (cleanItem.notes && !cleanItem.description && validCols.has('description')) cleanItem.description = cleanItem.notes;
        if (cleanItem.description && !cleanItem.notes && validCols.has('notes')) cleanItem.notes = cleanItem.description;

        for (const k of Object.keys(cleanItem)) {
          if (!validCols.has(k)) {
            delete cleanItem[k];
          }
        }
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

      const updateCols = keys.filter(k => k !== 'id').map(k => `"${k}" = EXCLUDED."${k}"`).join(', ');
      let sql = `INSERT INTO "${table}" (${cols}) VALUES (${placeholders})`;
      if (cleanItem.id && updateCols.length > 0) {
        sql += ` ON CONFLICT (id) DO UPDATE SET ${updateCols}`;
      }
      sql += ` RETURNING *;`;
      
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
    const cleanUpdates = { ...updates };
    const validCols = await getTableColumns(table);
    if (validCols) {
      if (!cleanUpdates.due_date && cleanUpdates.dueDate) cleanUpdates.due_date = cleanUpdates.dueDate;
      if (!cleanUpdates.created_at && cleanUpdates.createdAt) cleanUpdates.created_at = cleanUpdates.createdAt;
      if (!cleanUpdates.updated_at && cleanUpdates.updatedAt) cleanUpdates.updated_at = cleanUpdates.updatedAt;
      if (!cleanUpdates.client_id && cleanUpdates.clientId) cleanUpdates.client_id = cleanUpdates.clientId;
      if (!cleanUpdates.project_id && cleanUpdates.projectId) cleanUpdates.project_id = cleanUpdates.projectId;
      if (cleanUpdates.notes && !cleanUpdates.description && validCols.has('description')) cleanUpdates.description = cleanUpdates.notes;
      if (cleanUpdates.description && !cleanUpdates.notes && validCols.has('notes')) cleanUpdates.notes = cleanUpdates.description;

      for (const k of Object.keys(cleanUpdates)) {
        if (!validCols.has(k)) {
          delete cleanUpdates[k];
        }
      }
    }

    if (Object.keys(cleanUpdates).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid update columns provided.' });
    }

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [k, v] of Object.entries(cleanUpdates)) {
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

export default router;

