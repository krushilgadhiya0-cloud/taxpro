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
    return res.status(400).json({
      success: false,
      error: 'This Gmail address is already registered as an Enterprise Super Administrator. Please sign in directly.'
    });
  }

  const newId = USR-;
  const userName = name || 'New Finance Manager';

  try {
    const { query } = await import('../../server/db.js');
    if (query) {
      const checkUser = await query('SELECT id FROM users WHERE LOWER(email) =  LIMIT 1', [cleanEmail]);
      if (checkUser.rowCount > 0) {
        return res.status(400).json({
          success: false,
          error: 'This Gmail address is already registered. Please sign in.'
        });
      }

      const checkTeam = await query('SELECT id FROM team_members WHERE LOWER(email) =  LIMIT 1', [cleanEmail]);
      if (checkTeam.rowCount > 0) {
        return res.status(400).json({
          success: false,
          error: 'This Gmail address is already registered as a team member. Please sign in.'
        });
      }

      await query(
        INSERT INTO users (id, email, password, name, role, company)
        VALUES (, , , , 'Financial Director', 'TaxPro Enterprise Client')
        RETURNING *;
      , [newId, cleanEmail, password, userName]);

      await query(
        INSERT INTO team_members (name, email, role, preset_password, status)
        VALUES (, , 'Financial Director', , 'Active')
        ON CONFLICT (email) DO NOTHING;
      , [userName, cleanEmail, password]);
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
