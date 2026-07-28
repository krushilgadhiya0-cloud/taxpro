import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { complaintText, reporterEmail, reporterName } = req.body;

  if (!complaintText) {
    return res.status(400).json({ success: false, error: 'Complaint text is required.' });
  }

  try {
    const data = await resend.emails.send({
      from: 'TaxPro Feedback System <onboarding@resend.dev>', 
      to: 'workforcepro09@gmail.com', // Direct to Boss/Owner inbox
      subject: '⚠️ New Platform Complaint Received',
      html: `
        <div style="font-family: sans-serif; padding: 25px; color: #1e1e2d; border-radius: 12px; background: #fff; max-width: 600px; border: 1px solid #fee2e2;">
           <h2 style="color: #dc2626; margin-top: 0;">New Platform Complaint Filed</h2>
           
           <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
             <p style="margin: 0 0 10px 0; font-size: 14px;"><b>Reporter:</b> ${reporterName || 'Unknown Employee'}</p>
             <p style="margin: 0 0 15px 0; font-size: 14px;"><b>Contact:</b> ${reporterEmail || 'Anonymous'}</p>
             <p style="margin: 0; font-size: 14px; font-weight: bold; color: #4B5563;">Complaint Description:</p>
             <p style="margin: 10px 0 0 0; font-size: 14px; white-space: pre-wrap; background: #ffffff; padding: 15px; border: 1px solid #e5e7eb; border-radius: 6px;">${complaintText}</p>
           </div>
           
           <p style="color: #6B7280; font-size: 12px; margin-top: 30px;">Sent securely from TaxPro Internal Telemetry.</p>
        </div>
      `,
    });

    if (data.error) {
      console.error('Resend Error:', data.error);
      return res.status(500).json({ success: false, error: data.error.message });
    }

    return res.status(200).json({ success: true, message: `Complaint routed successfully to Admin Mailbox.` });
  } catch (error) {
    console.error('Fetch Failure:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error sending complaint.' });
  }
}
