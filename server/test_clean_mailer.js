import nodemailer from 'nodemailer';

async function testCleanDelivery() {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'krushilgadhiya138@gmail.com',
      pass: 'zxzqedanapymshgm'
    }
  });

  const otpCode = '5829';
  const info = await transporter.sendMail({
    from: '"TaxPro Enterprise" <krushilgadhiya138@gmail.com>',
    to: 'krushilgadhiya138@gmail.com',
    replyTo: 'krushilgadhiya138@gmail.com',
    subject: `TaxPro Security Code: ${otpCode}`,
    text: `Hello,\n\nYour TaxPro account security code is: ${otpCode}\n\nThis verification code is valid for 10 minutes.\n\nThank you,\nTaxPro Enterprise Security Team`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
        <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">TaxPro Security Code</div>
          <p style="font-size: 14px; color: #475569; margin-bottom: 24px; line-height: 1.5;">
            Use the following 4-digit verification code to complete your authorization:
          </p>
          <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <span style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #0284c7;">${otpCode}</span>
          </div>
          <p style="font-size: 12px; color: #64748b; line-height: 1.4;">
            This security code expires in 10 minutes. If you did not make this request, you can safely ignore this email.
          </p>
          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; text-align: center;">
            TaxPro Financial & Practice Management Suite &bull; Automated Security Delivery
          </div>
        </div>
      </body>
      </html>
    `,
    headers: {
      'X-Priority': '1 (Highest)',
      'X-MSMail-Priority': 'High',
      'Importance': 'High',
      'X-Mailer': 'TaxPro Enterprise Auth Gateway 3.0'
    }
  });

  console.log('DELIVERED CLEAN INBOX TEST:', info.messageId);
}

testCleanDelivery();
