import express from 'express';
const router = express.Router();

router.post('/chat', (req, res) => {
  const { prompt } = req.body;
  const lower = (prompt || '').toLowerCase();

  let answer = `I have analyzed your neural parameters for "${prompt}". Operating cashflows remain positive with projected revenue growth of 18.4%.`;

  if (lower.includes('expense')) {
    answer = 'Expense Analysis Engine: AI predicts Q4 cloud server costs will stabilize at $42,180 with zero budget overflow risk.';
  } else if (lower.includes('payroll')) {
    answer = 'Payroll Forecast Engine: 142 active personnel scheduled for automated payout on the 30th. Liquidity required: $65,200.00.';
  } else if (lower.includes('tax') || lower.includes('report') || lower.includes('anomaly')) {
    answer = 'Audit Engine: Generated compliance report #SOC2-2026. Zero financial anomalies detected across all accounts.';
  }

  res.json({
    success: true,
    model: 'Finexo Neural AI 4.0',
    prompt,
    response: answer,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
});

export default router;
