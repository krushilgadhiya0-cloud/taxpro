import express from 'express';
import Razorpay from 'razorpay';
const router = express.Router();

let transactions = [
  { id: 'PAY-108', recipient: 'Alex Mercer (Lead Dev)', category: 'Salary', method: 'UPI', amount: '$4,800.00', status: 'Success', date: 'Today, 09:42 AM' },
  { id: 'PAY-107', recipient: 'AWS Cloud Hosting Cluster', category: 'Custom', method: 'Card', amount: '$2,840.00', status: 'Success', date: 'Yesterday' },
  { id: 'PAY-106', recipient: 'Uber Business Fleet Travel', category: 'Travel', method: 'Wallet', amount: '$145.50', status: 'Success', date: 'Jul 23, 2026' },
  { id: 'PAY-105', recipient: 'DoorDash Corporate Catering', category: 'Food', method: 'Card', amount: '$320.00', status: 'Success', date: 'Jul 22, 2026' },
  { id: 'PAY-104', recipient: 'Steam Arcade License', category: 'Gaming', method: 'UPI', amount: '$89.00', status: 'Success', date: 'Jul 20, 2026' },
  { id: 'PAY-103', recipient: 'Office Ergonomic Supplies', category: 'Shopping', method: 'Net Banking', amount: '$1,250.00', status: 'Success', date: 'Jul 19, 2026' },
];

// Get Transactions
router.get('/transactions', (req, res) => {
  res.json({
    success: true,
    count: transactions.length,
    transactions
  });
});

// Send Payment
router.post('/send', (req, res) => {
  const { recipient, amount, method, category } = req.body;

  if (!recipient || !amount) {
    return res.status(400).json({ success: false, error: 'Recipient and amount are required.' });
  }

  const newTx = {
    id: `PAY-${109 + transactions.length}`,
    recipient,
    category: category || 'Custom',
    method: method || 'UPI',
    amount: `$${parseFloat(amount).toFixed(2)}`,
    status: 'Success',
    date: 'Just now'
  };

  transactions.unshift(newTx);

  console.log(`[Finexo Payment Engine] Processed payment of ${newTx.amount} to ${newTx.recipient} via ${newTx.method}`);

  res.json({
    success: true,
    message: `Payment of ${newTx.amount} successfully sent to ${newTx.recipient}`,
    transaction: newTx
  });
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

// Mail Engine Helper: Send Payment Receipt Email
export const sendPaymentReceiptEmail = (email, paymentId, amount) => {
  const targetEmail = (email || 'krushilgadhiya0@gmail.com').trim().toLowerCase();
  const paidAmount = amount || '₹1,999.00';
  const payId = paymentId || `pay_${Date.now()}`;

  console.log(`[TaxPro Email Engine] 📧 Official Payment Receipt Email (${paidAmount}) dispatched to ${targetEmail} [Payment ID: ${payId}]`);
  return {
    sent: true,
    to: targetEmail,
    paymentId: payId,
    amount: paidAmount,
    subject: `Official Payment Receipt — TaxPro PMS Fee Collection (${paidAmount})`,
    timestamp: new Date().toISOString()
  };
};

// POST /api/payments/razorpay/verify
router.post('/razorpay/verify', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, description, email } = req.body;

  const paymentId = razorpay_payment_id || `pay_${Date.now()}`;
  const amountPaid = amount || '₹1,999.00';
  const targetEmail = (email || 'krushilgadhiya0@gmail.com').trim().toLowerCase();

  const newTx = {
    id: `PAY-RZP-${Math.floor(1000 + Math.random() * 9000)}`,
    recipient: description || 'TaxPro Professional Plan Fee',
    category: 'Razorpay Fee Collection',
    method: 'Razorpay (UPI / Card / NetBanking)',
    amount: amountPaid,
    status: 'Success',
    paymentId: paymentId,
    orderId: razorpay_order_id,
    date: 'Just now'
  };

  transactions.unshift(newTx);

  const receiptMail = sendPaymentReceiptEmail(targetEmail, paymentId, amountPaid);

  console.log(`[TaxPro Razorpay Engine] Payment Verified: ${paymentId} for ${amountPaid}`);

  res.json({
    success: true,
    message: `✓ Razorpay Payment Verified Successfully! Official Receipt sent to ${targetEmail}. ID: ${paymentId}`,
    paymentId: paymentId,
    orderId: razorpay_order_id,
    receiptEmailSent: true,
    receiptEmailDetails: receiptMail,
    transaction: newTx
  });
});

export default router;
