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

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Please enter your registered Email or Login ID and password.'
    });
  }

  let cleanEmail = String(email).trim().toLowerCase();
  const cleanPass = String(password).trim();

  // SuperAdmin Master Account Bypass
  const superAdmins = ['superadmin@taxpro.com', 'workforcepro09@gmail.com', 'krushilgadhiya0@gmail.com', 'krushilgadhiya138@gmail.com'];
  if (superAdmins.includes(cleanEmail) && (cleanPass === 'Krushil@2007' || cleanPass === 'password123')) {
    const token = `taxpro_jwt_session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    return res.json({
      success: true,
      message: 'Authentication successful! Welcome Super Administrator.',
      token,
      user: {
        id: 'USR-SUPERADMIN',
        name: 'Super Administrator',
        email: cleanEmail,
        role: 'Super Admin',
        department: 'Executive Governance',
        company: 'TaxPro Core'
      }
    });
  }

  try {
    const { query } = await import('../../server/db.js');
    if (!query) {
      throw new Error('Database connection not available');
    }

    // 1. Search in users table by Email OR ID
    let userRes = await query('SELECT * FROM users WHERE LOWER(email) = $1 OR LOWER(id) = $1 LIMIT 1', [cleanEmail]);
    let user = userRes.rows[0];

    // 2. Search associated team member record by Email OR ID
    const memberRes = await query('SELECT * FROM team_members WHERE LOWER(email) = $1 OR LOWER(id) = $1 LIMIT 1', [cleanEmail]);
    const member = memberRes.rows[0];

    // Harmonize cleanEmail if searched by ID
    if (member?.email) {
      cleanEmail = member.email.toLowerCase();
    } else if (user?.email) {
      cleanEmail = user.email.toLowerCase();
    }

    // Check suspension / revoked status
    if (member && (member.status === 'Access Revoked' || member.status === 'Suspended' || member.status === 'Past')) {
      return res.status(403).json({
        success: false,
        error: '🔒 Access Suspended: Your workspace credentials have been revoked by an Administrator.'
      });
    }

    // If not found in users, but found in team_members
    if (!user && member) {
      const isValidPass = (member.preset_password && member.preset_password.trim() === cleanPass) || cleanPass === 'password123' || cleanPass === 'Krushil@2007';
      if (isValidPass) {
        const userId = member.id ? `USR-${member.id.replace('EMP-', '')}` : `USR-${Date.now().toString().slice(-6)}`;
        const autoUserRes = await query(`
          INSERT INTO users (id, email, password, name, role, company, phone, phone_verified, lock_pin)
          VALUES ($1, $2, $3, $4, $5, 'TaxPro Enterprise', $6, TRUE, '1234')
          ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role, name = EXCLUDED.name
          RETURNING *;
        `, [userId, cleanEmail, cleanPass, member.name, member.role || 'Employee', member.phone || '']);
        user = autoUserRes.rows[0];
      }
    }

    if (!user && !member) {
      return res.status(400).json({
        success: false,
        error: `No registered account found for "${email}". Please verify your Login ID / Email or ask an Administrator for an invite.`
      });
    }

    // Verify Password against user.password or member.preset_password or master pass
    const isPasswordValid = 
      (user && user.password && user.password.trim() === cleanPass) ||
      (member && member.preset_password && member.preset_password.trim() === cleanPass) ||
      cleanPass === 'Krushil@2007' ||
      cleanPass === 'password123';

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Incorrect password. Please verify your credentials or ask your Administrator to reset your password.'
      });
    }

    // Activate member in team_members
    if (member && member.status !== 'Active') {
      try {
        await query("UPDATE team_members SET status = 'Active', online = TRUE WHERE LOWER(email) = $1", [cleanEmail]);
      } catch (e) {}
    }

    // Synchronize password in users if needed
    if (user && (!user.password || user.password !== cleanPass)) {
      try {
        await query("UPDATE users SET password = $1 WHERE id = $2", [cleanPass, user.id]);
      } catch (e) {}
    }

    const token = `taxpro_jwt_session_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    return res.json({
      success: true,
      message: 'Authentication successful! Welcome to TaxPro.',
      token,
      user: {
        id: user?.id || member?.id || 'USR-CURRENT',
        name: user?.name || member?.name || cleanEmail.split('@')[0],
        email: user?.email || member?.email || cleanEmail,
        role: member?.role || user?.role || 'Employee',
        department: member?.department || 'General',
        company: user?.company || 'TaxPro Enterprise',
        permissions: member?.permissions || null,
        phone: user?.phone || member?.phone || '',
        avatar: user?.avatar || member?.avatar || null
      }
    });
  } catch (err) {
    console.error('[Vercel Login API Error]:', err.message);

    // Fallback authentication if database connection failed
    const masterEmails = ['superadmin@taxpro.com', 'workforcepro09@gmail.com', 'krushilgadhiya0@gmail.com', 'krushilgadhiya138@gmail.com'];
    if (masterEmails.includes(cleanEmail) && (cleanPass === 'Krushil@2007' || cleanPass === 'password123')) {
      const token = `taxpro_jwt_session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      return res.json({
        success: true,
        message: 'Master authentication successful.',
        token,
        user: {
          id: 'USR-SUPERADMIN',
          name: cleanEmail.split('@')[0],
          email: cleanEmail,
          role: 'Administrator',
          department: 'Executive Management',
          company: 'TaxPro Enterprise'
        }
      });
    }

    return res.status(500).json({ success: false, error: 'Authentication service error: ' + err.message });
  }
}
