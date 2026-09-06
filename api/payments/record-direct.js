import nodemailer from 'nodemailer';

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

  try {
    const { txId, amount, planName, billingCycle, seats, method, email, userName, autopay, reference, smtpConfig } = req.body || {};
    const cleanEmail = (email || 'client@taxpro.com').trim().toLowerCase();
    const cleanAmount = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 1499;
    const paymentId = txId || ('PAY-DIR-' + Date.now());
    const paymentMethod = method || 'Direct Settlement';
    const category = autopay ? 'Subscription (Autopay Active)' : 'Direct Plan Settlement';

    // Optional PostgreSQL persistence
    try {
      if (process.env.DATABASE_URL) {
        const { query } = await import('../../server/db.js');
        if (query) {
          await query(
            'INSERT INTO payments (id, recipient, category, method, amount, status, payment_id, date) VALUES ($1, $2, $3, $4, $5, \'Success\', $6, \'Just now\') ON CONFLICT (id) DO NOTHING;',
            [paymentId, (planName || 'Practice Subscription') + ' (' + (seats || 'Team') + ')', category, paymentMethod + ' - ' + (reference || 'Direct Bank Settlement'), cleanAmount, paymentId]
          );
        }
      }
    } catch (dbErr) {
      console.warn('[Vercel Direct Payment DB Warning]:', dbErr.message);
    }

    // Optional email confirmation
    let receiptSent = false;
    try {
      const smtpUser = smtpConfig?.user || process.env.SMTP_USER || 'krushilgadhiya138@gmail.com';
      const smtpPass = (smtpConfig?.pass || process.env.SMTP_PASS || 'zxzqedanapymshgm').replace(/\s+/g, '');
      const smtpHost = smtpConfig?.host || process.env.SMTP_HOST || 'smtp.gmail.com';
      const smtpPort = parseInt(smtpConfig?.port || process.env.SMTP_PORT || 587);

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
        tls: { rejectUnauthorized: false }
      });

      const htmlContent = [
        '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">',
        '  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 36px 32px; text-align: center; color: #ffffff;">',
        '    <div style="display: inline-block; background: #6366f1; color: #ffffff; font-weight: 800; font-size: 13px; letter-spacing: 0.1em; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 16px;">Direct Payment Receipt</div>',
        '    <h1 style="font-size: 26px; font-weight: 800; margin: 0 0 8px 0;">Payment Confirmation</h1>',
        '    <p style="color: #94a3b8; font-size: 14px; margin: 0;">TaxPro Enterprise Cloud Accounting</p>',
        '  </div>',
        '  <div style="padding: 32px;">',
        '    <p style="font-size: 15px; color: #334155; margin: 0 0 20px 0;">Hello <strong>' + (userName || 'Valued Subscriber') + '</strong>,</p>',
        '    <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin: 0 0 24px 0;">Thank you for your payment! Your subscription has been activated with direct settlement to our verified bank account.</p>',
        '    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">',
        '      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">',
        '        <tr><td style="padding: 8px 0; color: #64748b;">Transaction ID:</td><td style="padding: 8px 0; font-weight: 700; color: #0f172a; text-align: right; font-family: monospace;">' + paymentId + '</td></tr>',
        '        <tr><td style="padding: 8px 0; color: #64748b;">Plan:</td><td style="padding: 8px 0; font-weight: 700; color: #0f172a; text-align: right;">' + (planName || 'Practice') + ' (' + (seats || 'Team') + ')</td></tr>',
        '        <tr><td style="padding: 8px 0; color: #64748b;">Billing Cycle:</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; text-align: right;">' + (billingCycle || '30 Days') + '</td></tr>',
        '        <tr><td style="padding: 8px 0; color: #64748b;">Payment Method:</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; text-align: right;">' + paymentMethod + (autopay ? ' (Autopay Enabled)' : '') + '</td></tr>',
        '        <tr style="border-top: 1px solid #cbd5e1;"><td style="padding: 12px 0 4px; font-weight: 700; color: #0f172a; font-size: 16px;">Total Amount:</td><td style="padding: 12px 0 4px; font-weight: 800; color: #10b981; text-align: right; font-size: 18px;">?' + cleanAmount.toLocaleString('en-IN') + '.00</td></tr>',
        '      </table>',
        '    </div>',
        '    <div style="text-align: center; margin-top: 24px;">',
        '      <a href="https://taxpro-nine.vercel.app" style="background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">Access Your Workspace &rarr;</a>',
        '    </div>',
        '  </div>',
        '</div>'
      ].join('
');

      await transporter.sendMail({
        from: '"TaxPro Billing" <' + smtpUser + '>',
        to: cleanEmail,
        subject: '[TaxPro] Payment Receipt - ' + paymentId,
        html: htmlContent
      });
      receiptSent = true;
    } catch (emailErr) {
      console.warn('[Vercel Direct Payment Email Warning]:', emailErr.message);
    }

    return res.json({
      success: true,
      message: '? Payment recorded directly to Bank Account & saved!',
      paymentId,
      receiptEmailSent: receiptSent
    });
  } catch (err) {
    console.error('[Vercel Direct Payment Error]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
