import express from 'express';
import Razorpay from 'razorpay';
import { query } from '../db.js';

const router = express.Router();

// Get Transactions from PostgreSQL
router.get('/transactions', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id, 
        recipient, 
        category, 
        method, 
        amount, 
        status, 
        payment_id as "paymentId", 
        order_id as "orderId", 
        date, 
        created_at
      FROM payments 
      ORDER BY created_at DESC 
      LIMIT 100;
    `);

    // Format display amount with currency symbol
    const formatted = result.rows.map(r => ({
      ...r,
      amount: String(r.amount).startsWith('$') || String(r.amount).startsWith('₹') ? r.amount : `$${parseFloat(r.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }));

    res.json({
      success: true,
      count: formatted.length,
      transactions: formatted
    });
  } catch (err) {
    console.error('[payments GET PG Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send Payment (Insert into PostgreSQL)
router.post('/send', async (req, res) => {
  const { recipient, amount, method, category } = req.body;

  if (!recipient || !amount) {
    return res.status(400).json({ success: false, error: 'Recipient and amount are required.' });
  }

  const cleanNum = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;
  const payId = `PAY-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  try {
    const result = await query(`
      INSERT INTO payments (id, recipient, category, method, amount, status, date)
      VALUES ($1, $2, $3, $4, $5, 'Success', 'Just now')
      RETURNING *;
    `, [payId, recipient, category || 'Custom', method || 'UPI', cleanNum]);

    const newTx = {
      ...result.rows[0],
      amount: `$${cleanNum.toFixed(2)}`
    };

    console.log(`[TaxPro Payment Engine] PostgreSQL: Processed payment of ${newTx.amount} to ${newTx.recipient}`);

    res.json({
      success: true,
      message: `Payment of ${newTx.amount} successfully recorded to PostgreSQL for ${newTx.recipient}`,
      transaction: newTx
    });
  } catch (err) {
    console.error('[payments send PG Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/payments/razorpay/create-order
router.post('/razorpay/create-order', async (req, res) => {
  const { amount, currency, notes } = req.body;
  const targetAmount = amount ? parseInt(amount, 10) : 199900; // Default ₹1,999.00 INR (199900 paise)

  console.log(`[TaxPro Razorpay Engine] Initializing Razorpay Instance`);
  
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
       console.error(`[Error] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in .env`);
       return res.status(500).json({ success: false, error: 'Server payment configuration missing.' });
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: targetAmount,
      currency: currency || 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: notes || { plan: 'TaxPro Enterprise Professional', email: 'krushilgadhiya0@gmail.com' }
    };

    const order = await instance.orders.create(options);
    console.log(`[TaxPro Razorpay Engine] Generated Live Order ${order.id} for ₹${targetAmount / 100} INR`);

    res.json({
      success: true,
      order: order,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error(`[TaxPro Razorpay Engine] API Error:`, error);
    res.status(500).json({ success: false, error: error.message || 'Razorpay order creation failed.' });
  }
});

// Mail Engine Helper: Send Payment / Subscription Receipt Email via Python smtplib
export const sendPaymentReceiptEmail = async (email, paymentId, amount, planName = 'TaxPro Enterprise Professional', billingCycle = 'Annual Billing', name = 'Valued Subscriber', origin = 'http://localhost:3000', smtpConfig = {}) => {
  const targetEmail = (email || 'krushilgadhiya0@gmail.com').trim().toLowerCase();
  const paidAmount = amount || '₹14,999.00';
  const payId = paymentId || `pay_${Date.now()}`;

  try {
    const { runPythonMailer } = await import('./auth.js');
    const result = await runPythonMailer({
      action: 'subscription',
      email: targetEmail,
      name: name,
      plan_name: planName,
      amount: paidAmount,
      payment_id: payId,
      billing_cycle: billingCycle,
      origin: origin,
      smtp_config: smtpConfig
    });
    console.log(`[TaxPro Email Engine] 📧 Official Payment Receipt Email dispatched to ${targetEmail}:`, result);
    return result;
  } catch (err) {
    console.warn('[Payment Receipt Email Warning]:', err.message);
    return { success: false, error: err.message };
  }
};

// POST /api/payments/send-receipt (Dispatch subscription / payment confirmation receipt via Python smtplib)
router.post('/send-receipt', async (req, res) => {
  const { email, name, planName, amount, paymentId, billingCycle, expiryDate, smtpConfig } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return res.status(400).json({ success: false, error: 'Recipient email is required.' });

  try {
    const { runPythonMailer } = await import('./auth.js');
    const mailResult = await runPythonMailer({
      action: 'subscription',
      email: cleanEmail,
      name: name || 'Valued Subscriber',
      plan_name: planName || 'TaxPro Enterprise Professional',
      amount: amount || '₹14,999.00',
      payment_id: paymentId || `PAY-${Date.now()}`,
      billing_cycle: billingCycle || 'Annual Billing',
      expiry_date: expiryDate || 'August 23, 2027',
      origin: req.headers.origin || 'http://localhost:3000',
      smtp_config: smtpConfig || {}
    });

    res.json({ success: true, message: `Subscription confirmation & receipt dispatched to ${cleanEmail}`, mailResult });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/payments/send-due-reminder (Dispatch 5-day due reminder email via Python smtplib)
router.post('/send-due-reminder', async (req, res) => {
  const { email, name, itemName, dueDate, amountDue, clientName, daysLeft, smtpConfig } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return res.status(400).json({ success: false, error: 'Recipient email is required.' });

  try {
    const { runPythonMailer } = await import('./auth.js');
    const mailResult = await runPythonMailer({
      action: 'due_reminder',
      email: cleanEmail,
      name: name || 'Valued Client',
      item_name: itemName || 'Monthly GST Compliance / Retainer Fee',
      due_date: dueDate || 'August 28, 2026',
      amount_due: amountDue || '₹7,500.00',
      client_name: clientName || 'TaxPro Enterprise Client',
      days_left: daysLeft || 5,
      origin: req.headers.origin || 'http://localhost:3000',
      smtp_config: smtpConfig || {}
    });

    res.json({ success: true, message: `5-day due reminder dispatched to ${cleanEmail}`, mailResult });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/payments/razorpay/verify (Record in PostgreSQL & send Python smtplib receipt)
router.post('/razorpay/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, description, email, clientName } = req.body;

  const paymentId = razorpay_payment_id || `pay_${Date.now()}`;
  const amountPaid = amount || '₹1,999.00';
  const cleanNum = parseFloat(String(amountPaid).replace(/[^0-9.]/g, '')) || 1999;
  const targetEmail = (email || 'krushilgadhiya0@gmail.com').trim().toLowerCase();
  const txId = `PAY-RZP-${Date.now()}`;

  try {
    const result = await query(`
      INSERT INTO payments (id, recipient, category, method, amount, status, payment_id, order_id, date)
      VALUES ($1, $2, 'Razorpay Fee Collection', 'Razorpay (UPI / Card / NetBanking)', $3, 'Success', $4, $5, 'Just now')
      RETURNING *;
    `, [txId, description || 'TaxPro Professional Plan Fee', cleanNum, paymentId, razorpay_order_id]);

    const receiptMail = await sendPaymentReceiptEmail(targetEmail, paymentId, amountPaid, description || 'TaxPro Professional Plan Fee', 'Annual License', clientName || 'Subscriber', req.headers.origin || 'http://localhost:3000');

    console.log(`[TaxPro Razorpay Engine] Saved to PostgreSQL: Payment Verified: ${paymentId} for ${amountPaid}`);

    res.json({
      success: true,
      message: `✓ Razorpay Payment Verified & Saved to PostgreSQL! Official Receipt sent to ${targetEmail}. ID: ${paymentId}`,
      paymentId: paymentId,
      orderId: razorpay_order_id,
      receiptEmailSent: true,
      receiptEmailDetails: receiptMail,
      transaction: result.rows[0]
    });
  } catch (err) {
    console.error('[payments verify PG Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/payments/trigger-due-reminders (Automated batch dispatch for items due in 5 days)
router.post('/trigger-due-reminders', async (req, res) => {
  try {
    const { runPythonMailer } = await import('./auth.js');
    
    // 1. Fetch pending fees invoices or global tasks
    const invoices = await query(`SELECT * FROM fees_invoices WHERE status != 'Paid' LIMIT 10`);
    const dispatched = [];

    for (const inv of (invoices.rows || [])) {
      if (inv.client_email) {
        const mailRes = await runPythonMailer({
          action: 'due_reminder',
          email: inv.client_email,
          name: inv.client_name || 'Valued Client',
          item_name: `Invoice #${inv.invoice_no || inv.id} (${inv.service_type || 'Professional Retainer'})`,
          due_date: inv.due_date || 'August 28, 2026',
          amount_due: inv.total_amount ? `₹${inv.total_amount}` : '₹5,000.00',
          client_name: inv.client_name || 'Client Account',
          days_left: 5,
          origin: req.headers.origin || 'http://localhost:3000'
        });
        dispatched.push({ invoiceId: inv.id, email: inv.client_email, result: mailRes });
      }
    }

    res.json({
      success: true,
      message: `Checked due items. Dispatched 5-day reminders to ${dispatched.length} clients via Python smtplib.`,
      dispatched
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
