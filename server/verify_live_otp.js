import nodemailer from 'nodemailer';

async function verifyLiveOtpTransmission() {
  console.log('[Live OTP Verification] Initializing Google SMTP connection...');

  const smtpUser = 'krushilgadhiya138@gmail.com';
  const smtpPass = 'zxzqedanapymshgm';
  const targetEmail = 'krushilgadhiya138@gmail.com';
  const testOtp = Math.floor(1000 + Math.random() * 9000).toString();

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
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
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
      <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);">
        <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">TaxPro Security Code</div>
        <p style="font-size: 14px; color: #475569; margin-bottom: 24px; line-height: 1.5;">
          Use the following 4-digit verification code to complete your security authentication:
        </p>
        <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-family: monospace; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #0284c7;">${testOtp}</span>
        </div>
        <p style="font-size: 12px; color: #64748b; line-height: 1.4;">
          This verification code is valid for 10 minutes. Timestamp: ${new Date().toISOString()}
        </p>
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; text-align: center;">
          TaxPro Enterprise Financial Platform &bull; Automated Security Transmission
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"TaxPro Enterprise" <${smtpUser}>`,
      to: targetEmail,
      replyTo: smtpUser,
      subject: `TaxPro Security Code: ${testOtp}`,
      text: `Hello,\n\nYour TaxPro account verification code is: ${testOtp}\n\nThis code is valid for 10 minutes.\n\nThank you,\nTaxPro Enterprise Security Team`,
      html: htmlContent,
      headers: {
        'X-Priority': '1 (Highest)',
        'X-MSMail-Priority': 'High',
        'Importance': 'High',
        'X-Mailer': 'TaxPro Enterprise Auth Gateway 3.0',
        'X-Entity-Ref-ID': `TAXPRO-TEST-${Date.now()}`
      }
    });

    console.log('---------------------------------------------------------');
    console.log('✅ LIVE OTP DISPATCH CONFIRMED SUCCESSFUL!');
    console.log(`📤 Recipient Email : ${targetEmail}`);
    console.log(`🔑 Dispatched OTP   : ${testOtp}`);
    console.log(`📨 Message ID      : ${info.messageId}`);
    console.log(`📬 SMTP Response   : ${info.response}`);
    console.log('---------------------------------------------------------');
  } catch (error) {
    console.error('❌ LIVE OTP DISPATCH FAILED:', error.message);
  }
}

verifyLiveOtpTransmission();
