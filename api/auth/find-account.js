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

  const { email } = req.body || {};
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail) {
    return res.status(400).json({ success: false, error: 'Email address is required.' });
  }

  const superAdmins = ['workforcepro09@gmail.com', 'krushilgadhiya0@gmail.com', 'krushilgadhiya138@gmail.com', 'superadmin@taxpro.com'];
  if (superAdmins.includes(cleanEmail)) {
    return res.json({
      success: true,
      account: {
        id: 'SUPERADMIN-ROOT',
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        role: 'Super Admin',
        company: 'TaxPro Enterprise Platform'
      }
    });
  }

  try {
    const { query } = await import('../../server/db.js');
    if (query) {
      const userRes = await query('SELECT id, email, name, role, company FROM users WHERE LOWER(email) = $1 LIMIT 1', [cleanEmail]);
      if (userRes.rowCount > 0) {
        const u = userRes.rows[0];
        return res.json({
          success: true,
          account: {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role || 'Admin',
            company: u.company
          }
        });
      }

      const memRes = await query('SELECT id, email, name, role, department, designation FROM team_members WHERE LOWER(email) = $1 LIMIT 1', [cleanEmail]);
      if (memRes.rowCount > 0) {
        const m = memRes.rows[0];
        return res.json({
          success: true,
          account: {
            id: m.id,
            name: m.name,
            email: m.email,
            role: m.designation || m.role || 'Team Member',
            department: m.department
          }
        });
      }
    }
  } catch (err) {
    console.warn('[Vercel find-account DB Warning]:', err.message);
  }

  return res.status(404).json({
    success: false,
    notRegistered: true,
    error: `Account not found. "${cleanEmail}" is not registered in the system directory.`
  });
}
