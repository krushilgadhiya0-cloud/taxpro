import express from 'express';
import nodemailer from 'nodemailer';
import axios from 'axios';
import { query } from '../db.js';
import { registerInvitedUser, runPythonMailer } from './auth.js';

const router = express.Router();

// GET /api/integrations/config (Load configurations directly from PostgreSQL SQL)
router.get('/config', async (req, res) => {
  try {
    const result = await query('SELECT type, config, is_active, updated_at FROM integrations');
    const configs = {};
    result.rows.forEach(row => {
      configs[row.type] = {
        config: row.config,
        isActive: row.is_active,
        updatedAt: row.updated_at
      };
    });
    res.json({ success: true, configs });
  } catch (error) {
    console.error('[SQL Integrations Fetch Error]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/integrations/config (Save configuration directly into PostgreSQL SQL)
router.post('/config', async (req, res) => {
  const { type, config, is_active } = req.body;
  if (!type || !config) {
    return res.status(400).json({ success: false, error: 'Type and config payload are required.' });
  }

  const integrationId = `INT-${type.toUpperCase()}`;
  try {
    await query(`
      INSERT INTO integrations (id, type, config, is_active, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (type) DO UPDATE 
      SET config = EXCLUDED.config, is_active = EXCLUDED.is_active, updated_at = NOW()
    `, [integrationId, type, JSON.stringify(config), is_active !== false]);

    res.json({ success: true, message: `✓ Integration settings for ${type} successfully saved in PostgreSQL SQL database!` });
  } catch (error) {
    console.error('[SQL Integrations Save Error]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/integrations/invite (Dispatch invite and save to SQL)
router.post('/invite', async (req, res) => {
  const { smtpConfig, memberName, targetEmail, generatedPassword, role, origin, id, employeeId } = req.body;

  try {
    if (!targetEmail) {
       return res.status(400).json({ success: false, error: 'Target email is required.' });
    }

    // 1. ALWAYS Register the member into the database so they can log in immediately:
    const regResult = await registerInvitedUser({
      email: targetEmail,
      password: generatedPassword,
      name: memberName,
      id: id || employeeId,
      role: role || 'Employee',
      origin: origin || 'https://taxpro-nine.vercel.app',
      smtpConfig
    });

    console.log(`[TaxPro Integrations] Invitation Result:`, regResult);
    
    res.json({ 
      success: true, 
      message: `Invitation successfully dispatched to ${targetEmail}!`, 
      mailResult: regResult.emailResult || { success: true },
      credentials: regResult.credentials
    });
  } catch (error) {
    console.error(`[TaxPro Integrations] Invitation Email Failure:`, error.message);
    res.status(500).json({ success: false, error: `Could not send invite email: ${error.message}` });
  }
});

// POST /api/integrations/test-smtp (Test & persist SMTP in PostgreSQL SQL)
router.post('/test-smtp', async (req, res) => {
  const { host, port, user, pass, sender_email, target_email } = req.body;

  try {
    if (!host || !user || !pass) {
      return res.status(400).json({ success: false, error: 'Missing SMTP credentials (host, user, pass required).' });
    }

    // 1. Test SMTP Transporter
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10) || 587,
      secure: parseInt(port, 10) === 465,
      auth: { user, pass }
    });

    await transporter.verify();

    // 2. If target email provided, send a verification ping
    if (target_email) {
      await transporter.sendMail({
        from: sender_email || user,
        to: target_email,
        subject: 'TaxPro Integration Verified: Custom SMTP Server',
        text: 'Your TaxPro custom SMTP email server is active and verified in the database.'
      });
    }

    // 3. Persist in PostgreSQL SQL
    const intId = 'INT-SMTP';
    const configPayload = { host, port, user, pass, sender_email, target_email };
    await query(`
      INSERT INTO integrations (id, type, config, is_active, updated_at)
      VALUES ($1, 'smtp', $2, TRUE, NOW())
      ON CONFLICT (type) DO UPDATE 
      SET config = EXCLUDED.config, is_active = TRUE, updated_at = NOW()
    `, [intId, JSON.stringify(configPayload)]);

    res.json({ success: true, message: '✓ SMTP Configuration Verified & Saved in SQL Database!' });
  } catch (error) {
    console.error(`[TaxPro Integrations] SMTP Failure:`, error.message);
    res.status(500).json({ success: false, error: `SMTP Verification Failed: ${error.message}` });
  }
});

// POST /api/integrations/test-whatsapp (Test & persist WhatsApp in PostgreSQL SQL)
router.post('/test-whatsapp', async (req, res) => {
  const { block_token, phone_id, target_phone } = req.body;

  try {
    if (!block_token || !phone_id || !target_phone) {
       return res.status(400).json({ success: false, error: 'Missing Meta Graph API tokens or target phone.' });
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: target_phone,
      type: 'text',
      text: {
        preview_url: false,
        body: '🚀 TaxPro Integration Verified! Your custom WhatsApp Business API pipeline is now active.'
      }
    };

    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${phone_id}/messages`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${block_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`[TaxPro Integrations] WhatsApp Ping Delivered: ${response.data.messages?.[0]?.id}`);

    // Persist in PostgreSQL SQL
    const intId = 'INT-WHATSAPP';
    const configPayload = { block_token, phone_id, target_phone };
    await query(`
      INSERT INTO integrations (id, type, config, is_active, updated_at)
      VALUES ($1, 'whatsapp', $2, TRUE, NOW())
      ON CONFLICT (type) DO UPDATE 
      SET config = EXCLUDED.config, is_active = TRUE, updated_at = NOW()
    `, [intId, JSON.stringify(configPayload)]);

    res.json({ success: true, message: '✓ WhatsApp Verified & Saved in SQL Database!' });

  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    console.error(`[TaxPro Integrations] WhatsApp API Failure:`, errorMsg);
    res.status(500).json({ success: false, error: `Meta API Rejected: ${errorMsg}` });
  }
});

export default router;
