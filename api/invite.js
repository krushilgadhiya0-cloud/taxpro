import nodemailer from 'nodemailer';

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

  const { memberName, name, targetEmail, email, generatedPassword, password, role, department, origin, smtpConfig } = req.body || {};

  const recipientEmail = (targetEmail || email || '').trim().toLowerCase();
  const recipientName = (memberName || name || recipientEmail.split('@')[0]).trim();
  const rawPass = (generatedPassword || password || '').trim() || `TaxPro@${Math.floor(1000 + Math.random() * 9000)}`;
  const userRole = role || 'Employee';
  const userDept = department || 'General Practice';
  const loginUrl = origin || req.headers.origin || 'https://taxpro-suite.vercel.app';

  if (!recipientEmail || !recipientEmail.includes('@')) {
    return res.status(400).json({ success: false, error: 'Valid recipient email is required.' });
  }

  // Resolve SMTP credentials
  const smtpUser = smtpConfig?.user || process.env.SMTP_USER || 'krushilgadhiya138@gmail.com';
  const smtpPass = (smtpConfig?.pass || process.env.SMTP_PASS || 'zxzqedanapymshgm').replace(/\s+/g, '');
  const smtpHost = smtpConfig?.host || process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(smtpConfig?.port || process.env.SMTP_PORT || 587);

  const portalName = userRole === 'Manager' ? 'Manager Portal' : (userRole === 'Administrator' ? 'Administrator Portal' : 'Employee Portal');

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 36px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);">
          
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
            <div style="font-size: 22px; font-weight: 900; color: #0284c7; letter-spacing: -0.5px;">⚡ TAXPRO 3.0</div>
          </div>

          <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0;">
            Welcome to the Team, ${recipientName}!
          </h2>

          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
            You have been invited to join the TaxPro Practice Management Platform as an authorized <strong>${userRole}</strong> in the <strong>${userDept}</strong> division.
          </p>

          <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <div style="font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
              Your Account Access Credentials:
            </div>
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 110px;">Portal Access:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${portalName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Login Email:</td>
                <td style="padding: 6px 0; font-family: monospace; font-weight: 700; color: #0284c7;">${recipientEmail}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Password:</td>
                <td style="padding: 6px 0; font-family: monospace; font-weight: 700; color: #0f172a; font-size: 15px;">${rawPass}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${loginUrl}" style="display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; padding: 12px 32px; border-radius: 10px; box-shadow: 0 4px 6px rgba(2, 132, 199, 0.25);">
              Login to Workspace &rarr;
            </a>
          </div>

          <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 20px 0;">
            Please sign in using your portal credentials to access practice projects, task assignments, and direct communications.
          </p>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 11px; color: #94a3b8; text-align: center;">
            TaxPro Financial & Practice Intelligence Suite &bull; Secured with Google SMTP TLS
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"TaxPro Enterprise" <${smtpUser}>`,
      to: recipientEmail,
      replyTo: smtpUser,
      subject: `Invitation: Join TaxPro Workspace as ${userRole}`,
      text: `Hello ${recipientName},\n\nYou have been invited to join TaxPro Workspace as ${userRole}.\n\nPortal: ${portalName}\nLogin Email: ${recipientEmail}\nPassword: ${rawPass}\nURL: ${loginUrl}\n\nPlease sign in to get started.`,
      html: htmlContent,
      headers: {
        'X-Priority': '1 (Highest)',
        'X-MSMail-Priority': 'High',
        'Importance': 'High',
        'X-Mailer': 'TaxPro Enterprise Team Invitation Gateway',
        'X-Entity-Ref-ID': `TAXPRO-INVITE-${Date.now()}`
      }
    });

    console.log(`[Vercel Serverless Invite Mailer] ✓ Invitation email successfully delivered to ${recipientEmail}`);

    return res.status(200).json({
      success: true,
      emailDispatched: true,
      message: `✓ Official invitation dispatched to ${recipientEmail}`,
      credentials: {
        email: recipientEmail,
        password: rawPass,
        role: userRole,
        department: userDept,
        name: recipientName
      }
    });
  } catch (err) {
    console.error('[Vercel Serverless Invite Mailer Error]:', err.message);
    return res.status(200).json({
      success: true,
      emailDispatched: false,
      error: err.message,
      credentials: {
        email: recipientEmail,
        password: rawPass,
        role: userRole,
        department: userDept,
        name: recipientName
      }
    });
  }
}
