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

  const { email, newPassword } = req.body || {};

  if (!email || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'Gmail address and new password are required.'
    });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const { query } = await import('../../server/db.js');
    if (query) {
      const userRes = await query(
        UPDATE users 
        SET password =  
        WHERE LOWER(email) =  
        RETURNING *;
      , [newPassword, cleanEmail]);

      await query(
        UPDATE team_members 
        SET preset_password =  
        WHERE LOWER(email) = ;
      , [newPassword, cleanEmail]);

      if (userRes.rowCount === 0) {
        const superAdmins = ['workforcepro09@gmail.com', 'krushilgadhiya0@gmail.com', 'krushilgadhiya138@gmail.com', 'superadmin@taxpro.com'];
        const memRes = await query('SELECT id FROM team_members WHERE LOWER(email) = ', [cleanEmail]);
        if (memRes.rowCount === 0) {
          if (superAdmins.includes(cleanEmail)) {
            await query(
              INSERT INTO users (id, email, password, name, role, company)
              VALUES (, , , , 'Super Admin', 'TaxPro Enterprise Platform')
              ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password;
            , [USR-, cleanEmail, newPassword, cleanEmail.split('@')[0]]);
          } else {
            return res.status(400).json({
              success: false,
              error: 'This Gmail address is not registered in the system.'
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Vercel Reset Password DB Warning]:', err.message);
  }

  return res.json({
    success: true,
    message: '✓ Password updated successfully! Please sign in with your new password.'
  });
}
