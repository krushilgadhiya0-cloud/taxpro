import { Resend } from 'resend';

// Initialize Resend via Secure Vercel Environment Variable
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // CORS Headers for secure cross-origin requests
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins for the Vercel app
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Ensure it's a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { memberName, targetEmail, generatedPassword, role } = req.body;

  if (!targetEmail || !memberName) {
    return res.status(400).json({ success: false, error: 'Email and Name are required.' });
  }

  try {
    const data = await resend.emails.send({
      from: 'TaxPro Teams <onboarding@resend.dev>', // Resend's verified test domain. To use a custom one, add it to Resend dashboard.
      to: targetEmail,
      subject: 'Invitation to join TaxPro Workspace',
      html: `
        <div style="font-family: sans-serif; padding: 30px; text-align: center; color: #1e1e2d; border-radius: 12px; background: #f9fafb; max-width: 500px; margin: auto; border: 1px solid #eaeaea;">
           <h2 style="color: #0f766e; margin-top: 0;">Welcome to TaxPro 🚀</h2>
           <p style="font-size: 15px; color: #4B5563;">Hello <b>${memberName}</b>,</p>
           <p style="font-size: 15px; color: #4B5563;">You have been securely invited to join the TaxPro Cloud Workspace as a highly-privileged <b>${role}</b>.</p>
           
           <div style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: left; margin: 25px 0;">
             <p style="margin: 0 0 10px 0; font-size: 14px;"><b>Assigned Login ID:</b> ${targetEmail}</p>
             ${generatedPassword ? `<p style="margin: 0; font-size: 14px;"><b>Temporary Secure Password:</b> ${generatedPassword}</p>` : `<p style="margin: 0; color: #6B7280; font-size: 13px;"><i>Please use the verified onboarding link to define your own encrypted master password upon your first initial login.</i></p>`}
           </div>
           
           <p style="color: #10B981; font-weight: bold; font-size: 14px;">We look forward to seeing you inside!</p>
           <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
           <p style="font-size: 11px; color: #9CA3AF;">© 2026 TaxPro Global Financial</p>
        </div>
      `,
    });

    if (data.error) {
      console.error('Resend Error:', data.error);
      return res.status(500).json({ success: false, error: data.error.message });
    }

    return res.status(200).json({ success: true, message: `Email delivered smoothly via Resend!` });
  } catch (error) {
    console.error('Critical Fetch Failure:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error sending email.' });
  }
}
