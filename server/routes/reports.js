import express from 'express';
const router = express.Router();

const reports = [
  { id: 'REP-2026-01', title: 'Q2 Global Financial Audit & Tax Filing', type: 'Tax Return', status: 'Verified', date: 'Jul 24, 2026', size: '2.4 MB' },
  { id: 'REP-2026-02', title: 'SOC2 Type II Security & Data Ledger Log', type: 'Security Audit', status: 'Compliant', date: 'Jul 20, 2026', size: '4.1 MB' },
  { id: 'REP-2026-03', title: 'Workforce Automated Payroll & Deduction Summary', type: 'Payroll', status: 'Dispatched', date: 'Jul 15, 2026', size: '1.8 MB' },
  { id: 'REP-2026-04', title: 'AI Expense Neural Forecast Variance Report', type: 'AI Analytics', status: 'Generated', date: 'Jul 10, 2026', size: '3.2 MB' }
];

router.get('/', (req, res) => {
  res.json({
    success: true,
    count: reports.length,
    reports
  });
});

router.post('/generate', (req, res) => {
  const { type, title } = req.body;
  const newRep = {
    id: `REP-2026-${reports.length + 10}`,
    title: title || `${type || 'Compliance'} Automated AI Audit`,
    type: type || 'Tax Filing',
    status: 'Verified',
    date: 'Just Now',
    size: '2.8 MB'
  };
  reports.unshift(newRep);
  res.json({
    success: true,
    message: `Report "${newRep.title}" generated successfully!`,
    report: newRep
  });
});

export default router;
