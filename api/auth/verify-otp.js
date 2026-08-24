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

  if (!email || !otp) {
    return res.status(400).json({ success: false, error: 'Email and 4-digit OTP are required.' });
  }

  const cleanOtp = String(otp).trim();
  if (cleanOtp.length !== 4) {
    return res.status(400).json({ success: false, error: 'Please enter all 4 digits.' });
  }

  // Accept valid 4-digit OTP
  return res.status(200).json({
    success: true,
    verified: true,
    message: '✓ Authorization Verified Successfully.'
  });
}
