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

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email, password, name } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Gmail address and password are required.'
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const superAdmins = ['workforcepro09@gmail.com', 'krushilgadhiya0@gmail.com', 'krushilgadhiya138@gmail.com', 'superadmin@taxpro.com'];

  if (superAdmins.includes(cleanEmail)) {
    try {
      const { query } = await import('../../server/db.js');
      if (query) {
        await query('UPDATE users SET password = $1 WHERE LOWER(email) = $2;', [password, cleanEmail]);
        await query('UPDATE team_members SET preset_password = $1 WHERE LOWER(email) = $2;', [password, cleanEmail]);
      }
    } catch (e) {}
    return res.json({
      success: true,
      message: 'Enterprise Super Administrator credentials updated successfully! Redirecting to OTP verification.',
      userId: 'USR-SUPERADMIN',
      email: cleanEmail
    });
  }

  const newId = 'USR-' + Math.floor(1000 + Math.random() * 9000);
  const userName = name || 'New Finance Manager';

  try {
    const { query } = await import('../../server/db.js');
    if (query) {
      const checkUser = await query('SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1;', [cleanEmail]);
      if (checkUser.rowCount > 0) {
        await query('UPDATE users SET password = $1 WHERE LOWER(email) = $2;', [password, cleanEmail]);
        await query('UPDATE team_members SET preset_password = $1 WHERE LOWER(email) = $2;', [password, cleanEmail]);
        return res.json({
          success: true,
          message: 'Account password updated successfully! Redirecting to OTP verification.',
          userId: checkUser.rows[0].id,
          email: cleanEmail
        });
      }

      const checkTeam = await query('SELECT id FROM team_members WHERE LOWER(email) = $1 LIMIT 1;', [cleanEmail]);
      if (checkTeam.rowCount > 0) {
        await query('UPDATE team_members SET preset_password = $1 WHERE LOWER(email) = $2;', [password, cleanEmail]);
        await query('UPDATE users SET password = $1 WHERE LOWER(email) = $2;', [password, cleanEmail]);
        return res.json({
          success: true,
          message: 'Team member credentials updated successfully! Redirecting to OTP verification.',
          userId: checkTeam.rows[0].id,
          email: cleanEmail
        });
      }

      await query(
        'INSERT INTO users (id, email, password, name, role, company) VALUES ($1, $2, $3, $4, \'Financial Director\', \'TaxPro Enterprise Client\') RETURNING *;',
        [newId, cleanEmail, password, userName]
      );

      await query(
        'INSERT INTO team_members (name, email, role, preset_password, status) VALUES ($1, $2, \'Financial Director\', $3, \'Active\') ON CONFLICT (email) DO NOTHING;',
        [userName, cleanEmail, password]
      );
    }
  } catch (err) {
    console.warn('[Vercel Signup DB Warning]:', err.message);
  }

  return res.json({
    success: true,
    message: 'Gmail registered successfully! Redirecting to OTP verification.',
    userId: newId,
    email: cleanEmail
  });
}
