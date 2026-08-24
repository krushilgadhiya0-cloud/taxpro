import express from 'express';
import { query } from '../db.js';
import { isEmailRegistered, runPythonMailer, otpStore } from './auth.js';

const router = express.Router();

// Send / Resend OTP via Python smtplib
router.post('/send', async (req, res) => {
  const { email, smtpConfig } = req.body;
  const targetEmail = (email || '').trim().toLowerCase();

  if (!targetEmail) {
    return res.status(400).json({
      success: false,
      error: 'Email address is required for OTP dispatch.'
    });
  }

  // Enforce registered account requirement
  const isRegistered = await isEmailRegistered(targetEmail);
  if (!isRegistered) {
    return res.status(400).json({
      success: false,
      error: 'This email address is not registered in the system. Please register or contact your Administrator.'
    });
  }

  const otpCode = String(Math.floor(1000 + Math.random() * 9000));
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  otpStore.set(targetEmail, { otp: otpCode, expiresAt });

  console.log(`[TaxPro OTP Engine] 📧 Dispatched verification code to ${targetEmail}`);

  // Real smtplib dispatch
  const mailResult = await runPythonMailer({
    action: 'otp',
    email: targetEmail,
    otp: otpCode,
    smtp_config: smtpConfig || {}
  });

  res.json({
    success: true,
    message: `Secure verification code dispatched to ${targetEmail}`,
    email: targetEmail,
    expiresIn: 600,
    mailResult
  });
});

// Verify OTP against live database
router.post('/verify', async (req, res) => {
  const { code, email } = req.body;
  const targetEmail = (email || '').trim().toLowerCase();
  const cleanCode = String(code || '').trim();

  if (!targetEmail || !cleanCode) {
    return res.status(400).json({
      success: false,
      error: 'Both email and verification code are required.'
    });
  }

  const record = otpStore.get(targetEmail);

  if (!record) {
    return res.status(400).json({
      success: false,
      error: 'No active verification code found for this email. Please request a new code.'
    });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(targetEmail);
    return res.status(400).json({
      success: false,
      error: 'This verification code has expired. Please request a new code.'
    });
  }

  if (record.otp !== cleanCode) {
    return res.status(400).json({
      success: false,
      error: 'Invalid verification code. Please check your inbox and try again.'
    });
  }

  // Clear OTP on successful verification
  otpStore.delete(targetEmail);

  try {
    // Lookup real user from PostgreSQL database
    const userRes = await query('SELECT id, name, email, role, company FROM users WHERE LOWER(email) = $1 LIMIT 1', [targetEmail]);
    const user = userRes.rows[0] || {
      id: `USR-${Date.now().toString().slice(-6)}`,
      name: targetEmail.split('@')[0],
      email: targetEmail,
      role: 'Employee',
      company: 'TaxPro Enterprise'
    };

    const token = `taxpro_session_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    return res.json({
      success: true,
      verified: true,
      message: 'OTP Verification successful! Session token generated.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
        authenticatedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('[OTP Verify Route DB Error]:', err.message);
    return res.status(500).json({ success: false, error: 'Database verification error: ' + err.message });
  }
});

export default router;
