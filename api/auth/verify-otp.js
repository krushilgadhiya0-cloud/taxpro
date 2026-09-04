import crypto from 'crypto';

// Shared OTP Signing Secret for stateless verification across serverless lambdas
const OTP_SECRET = process.env.OTP_SECRET || process.env.JWT_SECRET || 'taxpro_super_secure_otp_vault_secret_2026';

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

  const { email, otp, token } = req.body || {};
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanOtp = String(otp || '').trim();

  if (!cleanEmail || !cleanOtp) {
    return res.status(400).json({ success: false, error: 'Email and verification OTP are required.' });
  }

  let verified = false;

  // 1. STATLESS VERIFICATION: Validate HMAC Cryptographic Token (Works 100% on Serverless/Vercel)
  if (token && typeof token === 'string') {
    const parts = token.split(':');
    if (parts.length === 3) {
      const [tokenEmail, tokenExpiresAt, tokenSignature] = parts;
      const expiry = parseInt(tokenExpiresAt, 10);

      if (tokenEmail.toLowerCase() === cleanEmail) {
        if (Date.now() > expiry) {
          return res.status(400).json({
            success: false,
            verified: false,
            error: 'This verification code has expired. Please request a new code.'
          });
        }

        const expectedSig = crypto
          .createHmac('sha256', OTP_SECRET)
          .update(`${cleanEmail}:${cleanOtp}:${tokenExpiresAt}`)
          .digest('hex');

        if (tokenSignature === expectedSig) {
          verified = true;
          console.log(`[Vercel Serverless OTP] ✓ Stateless HMAC OTP verified successfully for ${cleanEmail}`);
        }
      }
    }
  }

  // 2. DATABASE VERIFICATION: Check PostgreSQL app_storage if available
  if (!verified) {
    try {
      const { query } = await import('../../server/db.js');
      if (query) {
        const storageRes = await query('SELECT data FROM app_storage WHERE key = $1 LIMIT 1', [`otp_${cleanEmail}`]);
        if (storageRes.rowCount > 0 && storageRes.rows[0].data) {
          const parsed = typeof storageRes.rows[0].data === 'string'
            ? JSON.parse(storageRes.rows[0].data)
            : storageRes.rows[0].data;

          if (parsed && parsed.otp) {
            if (Date.now() > parsed.expiresAt) {
              try { await query('DELETE FROM app_storage WHERE key = $1', [`otp_${cleanEmail}`]); } catch(e){}
              return res.status(400).json({
                success: false,
                verified: false,
                error: 'This verification code has expired. Please request a new code.'
              });
            }

            if (String(parsed.otp).trim() === cleanOtp) {
              verified = true;
              try { await query('DELETE FROM app_storage WHERE key = $1', [`otp_${cleanEmail}`]); } catch(e){}
              console.log(`[Vercel Serverless OTP] ✓ Database app_storage OTP verified successfully for ${cleanEmail}`);
            }
          }
        }
      }
    } catch (dbErr) {
      // Database might not be connected or available; handled gracefully
    }
  }

  if (verified) {
    return res.status(200).json({
      success: true,
      verified: true,
      message: '✓ Authorization Verified Successfully.'
    });
  }

  return res.status(400).json({
    success: false,
    verified: false,
    error: 'Invalid verification code. Please check your email inbox and enter the exact code sent to you.'
  });
}
