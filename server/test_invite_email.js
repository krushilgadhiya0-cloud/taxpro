import nodemailer from 'nodemailer';

async function testInviteEmail() {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'krushilgadhiya138@gmail.com',
      pass: 'zxzqedanapymshgm'
    }
  });

  const recipientEmail = 'krushilgadhiya138@gmail.com';
  const recipientName = 'Ananya Patel';
  const userRole = 'Manager';
  const userDept = 'Tax & Compliance';
  const rawPass = 'TaxPro@7821';
  const loginUrl = 'https://taxpro-suite.vercel.app';
  const portalName = 'Manager Portal';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
      <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 36px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);">
        
        <div style="font-size: 22px; font-weight: 900; color: #0284c7; margin-bottom: 20px;">⚡ TAXPRO 3.0</div>

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

  const info = await transporter.sendMail({
    from: '"TaxPro Enterprise" <krushilgadhiya138@gmail.com>',
    to: recipientEmail,
    replyTo: 'krushilgadhiya138@gmail.com',
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

  console.log('✓ INVITATION EMAIL TEST DELIVERED SUCCESSFULLY! ID:', info.messageId);
}

testInviteEmail();
