import express from 'express';
import nodemailer from 'nodemailer';
import axios from 'axios';
import { google } from 'googleapis';
import { registerInvitedUser } from './auth.js';

const router = express.Router();

// POST /api/integrations/test-smtp
router.post('/test-smtp', async (req, res) => {
  const { host, port, user, pass, sender_email, target_email } = req.body;

  try {
    if (!host || !user || !pass) {
       return res.status(400).json({ success: false, error: 'Incomplete SMTP Configuration payload.' });
    }

    // Initialize real active SMTP transmission client
    const transporter = nodemailer.createTransport({
      host: host,
      port: port || 587,
      secure: port === 465 || port === '465',
      auth: { user, pass }
    });

    const mailOptions = {
      from: `"${sender_email || 'TaxPro TMS Integrations'}" <${user}>`,
      to: target_email || user,
      subject: 'TaxPro: Custom SMTP Integration Verified ✓',
      text: 'Congratulations! Your TaxPro workspace is now securely communicating through this custom SMTP server.',
      html: `
        <div style="font-family: sans-serif; padding: 20px; text-align: center; color: #1e1e2d; border-radius: 12px; background: #f9fafb;">
           <h2>Connection Successful! 🚀</h2>
           <p>Your custom SMTP server has been officially verified and linked to your TaxPro environment.</p>
           <p style="color: #25D366; font-weight: bold;">[SECURE HANDSHAKE VERIFIED]</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[TaxPro Integrations] SMTP Test Email blasted via ${host}: ${info.messageId}`);
    
    res.json({ success: true, message: `SMTP verification successful! Email delivered to ${mailOptions.to}` });
  } catch (error) {
    console.error(`[TaxPro Integrations] SMTP Failure:`, error.message);
    res.status(500).json({ success: false, error: `SMTP Handshake Failed: ${error.message}` });
  }
});

// POST /api/integrations/invite
router.post('/invite', async (req, res) => {
  const { smtpConfig, memberName, targetEmail, generatedPassword, role } = req.body;

  try {
    if (!targetEmail) {
       return res.status(400).json({ success: false, error: 'Target email is required.' });
    }

    // 1. ALWAYS Register the member into the database so they can log in immediately:
    registerInvitedUser(targetEmail, generatedPassword, memberName, role);

    // 2. Check if SMTP configuration is provided from the frontend
    if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
       console.log(`[TaxPro Integrations] No SMTP Config. Mock invite sent & User registered for ${targetEmail}`);
       return res.json({ success: true, message: `Mock Email Sent & User Registered.` });
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port || 587,
      secure: smtpConfig.port === 465 || smtpConfig.port === '465',
      auth: { user: smtpConfig.user, pass: smtpConfig.pass }
    });

    const mailOptions = {
      from: `"${smtpConfig.sender_email || 'TaxPro TMS'}" <${smtpConfig.user}>`,
      to: targetEmail,
      subject: `Invitation to join TaxPro Workspace`,
      text: `Hello ${memberName},\n\nYou have been invited to join the TaxPro Workspace as a ${role}.\n\nYour Login ID: ${targetEmail}\n${generatedPassword ? `Your Temporary Password: ${generatedPassword}` : ''}\n\nPlease login to access your dashboard.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; text-align: center; color: #1e1e2d; border-radius: 12px; background: #f9fafb; max-width: 500px; margin: auto;">
           <h2 style="color: #0f766e;">Welcome to TaxPro 🚀</h2>
           <p>Hello <b>${memberName}</b>,</p>
           <p>You have been invited to join the TaxPro Workspace as a <b>${role}</b>.</p>
           <div style="background: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: left; margin: 20px 0;">
             <p><b>Login ID:</b> ${targetEmail}</p>
             ${generatedPassword ? `<p><b>Password:</b> ${generatedPassword}</p>` : `<p><i>Please use the invitation link attached to define your own secure password.</i></p>`}
           </div>
           <p>Looking forward to collaborating with you!</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[TaxPro Integrations] Invitation Email sent to ${targetEmail}: ${info.messageId}`);
    
    res.json({ success: true, message: `Invitation successfully emailed to ${targetEmail}!` });
  } catch (error) {
    console.error(`[TaxPro Integrations] Invitation Email Failure:`, error.message);
    res.status(500).json({ success: false, error: `Could not send invite email: ${error.message}` });
  }
});


// POST /api/integrations/test-whatsapp
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
    res.json({ success: true, message: 'WhatsApp Verified! Check your device.' });

  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    console.error(`[TaxPro Integrations] WhatsApp API Failure:`, errorMsg);
    res.status(500).json({ success: false, error: `Meta API Rejected: ${errorMsg}` });
  }
});

// POST /api/integrations/test-calendar
router.post('/test-calendar', async (req, res) => {
  const { client_id, client_secret, refresh_token } = req.body;

  try {
    if (!client_id || !client_secret || !refresh_token) {
       return res.status(400).json({ success: false, error: 'Missing Google Cloud OAuth2 credentials.' });
    }

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret);
    oAuth2Client.setCredentials({ refresh_token });

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    
    // Inject a dummy meeting an hour from now
    const startTime = new Date(Date.now() + 3600000); 
    const endTime = new Date(Date.now() + 7200000);

    const event = {
      summary: 'TaxPro Integration Synchronized',
      description: 'Your TaxPro Google Calendar bridge was successfully validated!',
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
      colorId: '2' // Sage green
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    console.log(`[TaxPro Integrations] Calendar Event injected: ${response.data.htmlLink}`);
    res.json({ success: true, message: 'OAuth Verified! Event pinned to your Calendar.', link: response.data.htmlLink });

  } catch (error) {
    console.error(`[TaxPro Integrations] G-Calendar Failure:`, error.message);
    res.status(500).json({ success: false, error: `Google OAuth Rejected: ${error.message}` });
  }
});

export default router;
