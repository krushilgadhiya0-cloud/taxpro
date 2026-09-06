import nodemailer from 'nodemailer';

async function testCleanDelivery() {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'krushilgadhiya138@gmail.com',
      pass: 'zxzqedanapymshgm'
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  const otpCode = String(Math.floor(1000 + Math.random() * 9000));
  const targetEmail = 'krushilgadhiya0@gmail.com';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TaxPro Verification Code</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; color: #111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px;">
    <tr>
      <td>
        <div style="font-size: 20px; font-weight: 800; color: #0284c7; letter-spacing: -0.5px; margin-bottom: 20px;">TaxPro</div>
        <h1 style="font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 12px 0;">Your Verification Code</h1>
        <p style="font-size: 14px; line-height: 22px; color: #4b5563; margin: 0 0 20px 0;">
          Use the following 4-digit code to complete your verification on TaxPro. This code will expire in 10 minutes.
        </p>
        <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px 24px; text-align: center; margin: 0 0 24px 0;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #0284c7; display: inline-block;">${otpCode}</span>
        </div>
        <p style="font-size: 13px; line-height: 20px; color: #6b7280; margin: 0 0 24px 0;">
          If you did not request this verification code, you can safely ignore this email. Someone may have entered your email address by mistake.
        </p>
        <div style="border-top: 1px solid #f3f4f6; padding-top: 16px; font-size: 12px; color: #9ca3af; text-align: left;">
          TaxPro Practice Management Platform &bull; Automated Account Security
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const info = await transporter.sendMail({
    from: '"TaxPro" <krushilgadhiya138@gmail.com>',
    to: targetEmail,
    replyTo: 'krushilgadhiya138@gmail.com',
    subject: `${otpCode} is your TaxPro verification code`,
    text: `Your TaxPro verification code is: ${otpCode}\n\nThis code is valid for 10 minutes. If you did not request this code, you can safely ignore this message.\n\n— TaxPro Support`,
    html,
    date: new Date()
  });

  console.log(`[TEST SUCCESS] Sent OTP ${otpCode} to ${targetEmail}`);
  console.log('Message ID:', info.messageId);
  console.log('Response:', info.response);
}

testCleanDelivery().catch(err => {
  console.error('[TEST ERROR]:', err);
});
