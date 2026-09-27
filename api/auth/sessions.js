export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { query } = await import('../../server/db.js');
    if (!query) {
      throw new Error('Database connection not available');
    }

    if (req.method === 'GET') {
      const email = (req.query.email || '').trim().toLowerCase();
      const currentToken = (req.query.currentToken || '').trim();
      const currentDeviceId = (req.query.deviceId || '').trim();
      const isAll = req.query.all === 'true' || req.query.scope === 'global' || !email;

      let sessionsRes;
      if (isAll) {
        sessionsRes = await query(`
          SELECT * FROM user_sessions 
          WHERE is_revoked = FALSE 
          ORDER BY last_active DESC 
          LIMIT 150
        `);
      } else {
        sessionsRes = await query(`
          SELECT * FROM user_sessions 
          WHERE LOWER(user_email) = $1 AND is_revoked = FALSE 
          ORDER BY last_active DESC
        `, [email]);
      }

      const now = Date.now();
      const mapped = sessionsRes.rows.map((row, idx) => {
        const isCurrent = Boolean(
          (currentToken && row.session_token === currentToken) ||
          (currentDeviceId && row.device_id === currentDeviceId) ||
          (!isAll && !currentToken && !currentDeviceId && idx === 0)
        );
        const lastActiveTime = new Date(row.last_active || row.created_at).getTime();
        const diffMinutes = Math.floor((now - lastActiveTime) / (1000 * 60));

        return {
          id: row.id,
          sessionId: row.id,
          userEmail: row.user_email,
          email: row.user_email,
          sessionToken: row.session_token,
          deviceId: row.device_id,
          deviceName: row.device_name || 'Workstation Device',
          deviceType: row.device_type || 'desktop',
          osName: row.os_name || 'Desktop OS',
          browserName: row.browser_name || 'Browser',
          ipAddress: row.ip_address || '127.0.0.1',
          location: row.location || 'Local Secure Network',
          isCurrent,
          isOnline: diffMinutes <= 2,
          diffMinutes,
          createdAt: row.created_at,
          lastActive: row.last_active
        };
      });

      return res.json({ success: true, count: mapped.length, sessions: mapped });
    }

    if (req.method === 'POST') {
      const { sessionId, sessionToken } = req.body || {};
      if (!sessionId && !sessionToken) {
        return res.status(400).json({ success: false, error: 'Session ID or Token is required.' });
      }

      await query(`
        UPDATE user_sessions 
        SET is_revoked = TRUE, last_active = NOW() 
        WHERE id = $1 OR session_token = $2
      `, [sessionId || '', sessionToken || '']);

      return res.json({
        success: true,
        message: '✓ Session terminated successfully.'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
