import { query } from '../../server/db.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
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

  const { email, otp } = req.body || {};
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanOtp = String(otp || '').trim();

  if (!cleanEmail || !cleanOtp) {
    return res.status(400).json({ success: false, error: 'Email and verification OTP are required.' });
  }

  try {
    const storageRes = await query('SELECT value FROM app_storage WHERE key = $1 LIMIT 1', [`otp_${cleanEmail}`]);
    if (storageRes.rowCount === 0 || !storageRes.rows[0].value) {
      return res.status(400).json({ success: false, error: 'No active OTP found for this email. Please request a new verification code.' });
    }

    const parsed = typeof storageRes.rows[0].value === 'string' ? JSON.parse(storageRes.rows[0].value) : storageRes.rows[0].value;
    if (Date.now() > parsed.expiresAt) {
      await query('DELETE FROM app_storage WHERE key = $1', [`otp_${cleanEmail}`]);
      return res.status(400).json({ success: false, error: 'This verification code has expired. Please request a new code.' });
    }

    if (parsed.otp !== cleanOtp) {
      return res.status(400).json({ success: false, error: 'Invalid verification code. Please check your email inbox and enter the exact code sent to you.' });
    }

    await query('DELETE FROM app_storage WHERE key = $1', [`otp_${cleanEmail}`]);

    return res.status(200).json({
      success: true,
      verified: true,
      message: '✓ Authorization Verified Successfully.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Verification error: ' + err.message });
  }
}
